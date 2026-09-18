from django.shortcuts import render
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny, BasePermission
from django.core.serializers import serialize
from .serializers import *
from .models import SousPrefecture, CentreSante, Categorie, ResultatDuRapport, Offrir
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from django.shortcuts import get_object_or_404
import json
from django.db.models import Count, Sum, OuterRef, Subquery
from django.contrib.gis.db.models.functions import Area, Transform
from django.contrib.gis.geos import Point
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.views.decorators.http import require_http_methods
import csv
import io
import tempfile
import zipfile


STATUT_LABELS = {
    "sous_equipee": "Sous équipée",
    "equipee": "Équipée",
    "tres_sous_equipee": "Très sous équipée",
    "moyennement_equipee": "Moyennement équipée",
    "tres_equipee": "Très équipée",
}


class IsWebSIGAdmin(BasePermission):
    """Autorise les administrateurs Django ou ceux définis par le rôle WebSIG."""

    message = "Seuls les administrateurs peuvent créer un compte."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser or user.is_staff:
            return True
        role = getattr(user, "code_role", None)
        libelle = getattr(role, "libelle_role", "") if role else ""
        return "admin" in libelle.lower()



# Create your views here.
class RegisterUtilisateurAPIView(APIView):
    """
    API permettant de créer un nouvel utilisateur.
    """
    permission_classes = [IsWebSIGAdmin]
    def post(self, request, *args, **kwargs):

        serializer = RegisterUtilisateurSerializer(
            data=request.data
        )

        if serializer.is_valid():

            utilisateur = serializer.save()
            # Cet endpoint est réservé aux administrateurs : le compte créé
            # reçoit donc l'accès à l'espace d'administration Django/WebSIG.
            utilisateur.is_staff = True
            utilisateur.save(update_fields=["is_staff"])

            return Response(
                {
                    "message": "Utilisateur créé avec succès.",
                    "utilisateur": {
                        "num_utilisateur": utilisateur.num_utilisateur,
                        "username": utilisateur.username,
                        "first_name": utilisateur.first_name,
                        "last_name": utilisateur.last_name,
                        "email": utilisateur.email,
                        "telephone_utilisateur": utilisateur.telephone_utilisateur,
                        "photo": utilisateur.photo,
                        "code_role": (
                            utilisateur.code_role.code_role
                            if utilisateur.code_role
                            else None
                        ),
                    }
                },
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def mon_profil(request):
    if request.method == "GET":
        return Response(ProfilUtilisateurSerializer(request.user).data)

    serializer = ProfilUtilisateurSerializer(request.user, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def changer_mot_de_passe(request):
    ancien = request.data.get("ancien_mot_de_passe", "")
    nouveau = request.data.get("nouveau_mot_de_passe", "")
    confirmation = request.data.get("confirmation_mot_de_passe", "")
    if not request.user.check_password(ancien):
        return Response({"error": "Le mot de passe actuel est incorrect."}, status=status.HTTP_400_BAD_REQUEST)
    if nouveau != confirmation:
        return Response({"error": "La confirmation du mot de passe ne correspond pas."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        validate_password(nouveau, request.user)
    except ValidationError as error:
        return Response({"error": list(error.messages)}, status=status.HTTP_400_BAD_REQUEST)
    request.user.set_password(nouveau)
    request.user.save(update_fields=["password"])
    update_session_auth_hash(request, request.user)
    return Response({"message": "Mot de passe modifié avec succès."})
        

def sousprefecture_geojson(request):
    
    data = serialize(
        "geojson",
        SousPrefecture.objects.all(),
        geometry_field="geometry",
        fields=(
            "code_souspref",
            "libelle_souspref",
            "habitant",
        )
    )

    return JsonResponse(
        json.loads(data),
        safe=False
    )
    
    


def get_centre_sante(request):
    centres = CentreSante.objects.select_related(
        "code_categorie",
	    "code_souspref"
    ).prefetch_related(
        "services"
    )
    
    features = []
    for centre in centres:
        services = [
            {
                "code_service": service.code_service,
                "libelle_service": service.libelle_service
            }
            for service in centre.services.all()
            ]
        features.append({
             "type": "Feature",
             "id": centre.code_centre,
             "geometry":{
                 "type":"Point",
                 "coordinates": [
                     centre.geometry.x,
                     centre.geometry.y
                 ]
             },
             "properties":{
                 "code_centre": centre.code_centre,
                 "libelle_centre": centre.libelle_centre,
                 "contact_centre": centre.contact_centre,
                 "code_categorie": centre.code_categorie_id,
                 "code_souspref": centre.code_souspref_id,
                 "libelle_categorie":centre.code_categorie.libelle_categorie,
                 "libelle_souspref":centre.code_souspref.libelle_souspref,
                 "latitude":centre.latitude, 
                 "longitude":centre.longitude,
                 "services": services
                 
             }
        })
        
    return JsonResponse({
        "type":"FeatureCollection",
        "features":features
    })
    
    
def liste_categories(request):
    
    categories = list(
        Categorie.objects.values(
            "code_categorie",
            "libelle_categorie",
            "abreviation"
        ).order_by("libelle_categorie")
    )

    return JsonResponse(categories, safe=False)
    
    
@api_view(["GET"])
@permission_classes([AllowAny])
def sousprefectures_detail(request):
    queryset = (
        SousPrefecture.objects
        .prefetch_related(
            "centres__services",
            "rapports",
        )
        .select_related()
    )

    serializer = SousPrefectureDetailSerializer(
        queryset,
        many=True
    )

    return JsonResponse(
        serializer.data,
        safe=False
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def sousprefecture_detail(request, code_souspref):
    souspref = get_object_or_404(
        SousPrefecture.objects.prefetch_related("centres__services", "rapports"),
        code_souspref=code_souspref,
    )
    return JsonResponse(SousPrefectureDetailSerializer(souspref).data)
    
    
@api_view(["GET"])
@permission_classes([AllowAny])
def sousprefecture_par_nom(request, nom):

    souspref = get_object_or_404(
        SousPrefecture.objects.prefetch_related(
            "centres__services",
            "rapports",
        ),
        libelle_souspref__iexact=nom
    )

    serializer = SousPrefectureDetailSerializer(
        souspref
    )

    return JsonResponse(serializer.data)


def _superficie_km2(geometry):
    """Retourne une superficie geodesique en km2, sans colonne supplementaire."""
    if not geometry:
        return None
    # EPSG:6933 est une projection mondiale a surface equivalente.
    return round(geometry.transform(6933, clone=True).area / 1_000_000, 3)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_dashboard(request):
    latest_report = ResultatDuRapport.objects.filter(
        code_souspref=OuterRef("pk")
    ).order_by("-date_rapport")
    sousprefectures = SousPrefecture.objects.annotate(
        statut_actuel=Subquery(latest_report.values("statut")[:1])
    )

    statuts = {code: 0 for code in STATUT_LABELS}
    for item in sousprefectures.values("statut_actuel").annotate(total=Count("code_souspref")):
        if item["statut_actuel"] in statuts:
            statuts[item["statut_actuel"]] = item["total"]

    population = SousPrefecture.objects.aggregate(total=Sum("habitant"))["total"] or 0
    return JsonResponse({
        "sous_prefectures": SousPrefecture.objects.count(),
        "population": population,
        "centres_sante": CentreSante.objects.count(),
        "equipement": [
            {"code": code, "libelle": STATUT_LABELS[code], "total": total}
            for code, total in statuts.items()
        ],
    })


def _sousprefecture_data(sousprefecture):
    return {
        "id": sousprefecture.code_souspref,
        "libelle": sousprefecture.libelle_souspref,
        "habitant": sousprefecture.habitant,
        "superficie_km2": _superficie_km2(sousprefecture.geometry),
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_sousprefectures(request):
    recherche = request.query_params.get("q", "").strip()
    queryset = SousPrefecture.objects.all().order_by("libelle_souspref")
    if recherche:
        queryset = queryset.filter(libelle_souspref__icontains=recherche)
    return JsonResponse([_sousprefecture_data(item) for item in queryset], safe=False)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_sousprefecture_detail(request, code_souspref):
    sousprefecture = get_object_or_404(SousPrefecture, code_souspref=code_souspref)
    if request.method == "DELETE":
        # Les modèles historiques sont gérés par la base avec DO_NOTHING :
        # supprimer explicitement les dépendances évite une erreur de clé étrangère.
        with transaction.atomic():
            Offrir.objects.filter(code_centre__code_souspref=sousprefecture).delete()
            CentreSante.objects.filter(code_souspref=sousprefecture).delete()
            ResultatDuRapport.objects.filter(code_souspref=sousprefecture).delete()
            sousprefecture.delete()
        return JsonResponse({"message": "Sous-préfecture supprimée."})

    champs = {"libelle_souspref", "habitant"}
    for champ in champs:
        if champ in request.data:
            setattr(sousprefecture, champ, request.data[champ])
    sousprefecture.save(update_fields=list(champs.intersection(request.data.keys())))
    return JsonResponse(_sousprefecture_data(sousprefecture))


def _centre_data(centre):
    return {
        "id": centre.code_centre,
        "libelle": centre.libelle_centre,
        "contact": centre.contact_centre,
        "categorie": centre.code_categorie.libelle_categorie,
        "sous_prefecture": centre.code_souspref.libelle_souspref,
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_centres(request):
    recherche = request.query_params.get("q", "").strip()
    queryset = CentreSante.objects.select_related("code_categorie", "code_souspref").order_by("libelle_centre")
    if recherche:
        queryset = queryset.filter(libelle_centre__icontains=recherche)
    return JsonResponse([_centre_data(item) for item in queryset], safe=False)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_centre_detail(request, code_centre):
    centre = get_object_or_404(CentreSante, code_centre=code_centre)
    if request.method == "DELETE":
        # Un centre peut être référencé par la table d'association offrir.
        with transaction.atomic():
            Offrir.objects.filter(code_centre=centre).delete()
            centre.delete()
        return JsonResponse({"message": "Centre de santé supprimé."})

    champs = {"libelle_centre", "contact_centre", "latitude", "longitude"}
    for champ in champs:
        if champ in request.data:
            setattr(centre, champ, request.data[champ])
    if "code_categorie" in request.data:
        centre.code_categorie = get_object_or_404(Categorie, code_categorie=request.data["code_categorie"])
        champs.add("code_categorie")
    update_fields = list(champs.intersection(request.data.keys()))
    if "code_categorie" in request.data:
        update_fields.append("code_categorie")
    centre.save(update_fields=update_fields)
    centre = CentreSante.objects.select_related("code_categorie", "code_souspref").get(pk=centre.pk)
    return JsonResponse(_centre_data(centre))


def _csv_rows(upload):
    content = upload.read()
    for encoding in ("utf-8-sig", "cp1252"):
        try:
            text = content.decode(encoding)
            rows = list(csv.DictReader(io.StringIO(text)))
            return list(rows[0].keys()) if rows else [], rows
        except UnicodeDecodeError:
            continue
    raise ValueError("Encodage CSV non pris en charge.")


def _shapefile_rows(upload):
    from django.contrib.gis.gdal import DataSource

    with tempfile.TemporaryDirectory() as directory:
        archive_path = f"{directory}/import.zip"
        with open(archive_path, "wb") as archive:
            for chunk in upload.chunks():
                archive.write(chunk)
        with zipfile.ZipFile(archive_path) as archive:
            names = archive.namelist()
            if not any(name.lower().endswith(".shp") for name in names):
                raise ValueError("Le ZIP doit contenir un fichier .shp.")
            archive.extractall(directory)
        shapefile = next(path for path in __import__("pathlib").Path(directory).rglob("*.shp"))
        layer = DataSource(str(shapefile))[0]
        if not layer.srs or layer.srs.srid != 4326:
            raise ValueError("Le Shapefile doit être fourni en EPSG:4326.")
        fields = list(layer.fields)
        rows = []
        for feature in layer:
            row = {}
            for field in fields:
                value = feature.get(field)
                # Les valeurs OGR (ex. OFTString) ne sont pas sérialisables en JSON.
                value = value.value if hasattr(value, "value") else value
                row[field] = value if isinstance(value, (str, int, float, bool)) or value is None else str(value)
            row["__geometry__"] = feature.geom.wkt if feature.geom else None
            rows.append(row)
        return fields + ["__geometry__"], rows


def _read_import(upload):
    name = upload.name.lower()
    if name.endswith(".csv"):
        return "csv", *_csv_rows(upload)
    if name.endswith(".zip"):
        return "shp", *_shapefile_rows(upload)
    raise ValueError("Format non accepté. Utilisez un CSV ou un ZIP contenant un Shapefile.")


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def import_centres_preview(request):
    upload = request.FILES.get("file")
    if not upload:
        return JsonResponse({"error": "Aucun fichier reçu."}, status=400)
    try:
        source, fields, rows = _read_import(upload)
    except (ValueError, zipfile.BadZipFile) as error:
        return JsonResponse({"error": str(error)}, status=400)
    return JsonResponse({
        "source": source,
        "fields": fields,
        "sample": rows[:3],
        "model_fields": ["libelle_centre", "contact_centre", "code_categorie", "latitude", "longitude", "geometry"],
    })


def _value(row, mapping, field):
    source = mapping.get(field)
    return row.get(source) if source else None


def _point_from_row(row, mapping):
    geometry = _value(row, mapping, "geometry")
    if geometry:
        from django.contrib.gis.geos import GEOSGeometry
        point = GEOSGeometry(geometry)
        if point.geom_type != "Point":
            raise ValueError("La géométrie doit être un point.")
        point.srid = point.srid or 4326
        if point.srid != 4326:
            raise ValueError("Seules les géométries en EPSG:4326 sont acceptées.")
        return point
    longitude = _value(row, mapping, "longitude")
    latitude = _value(row, mapping, "latitude")
    if longitude in (None, "") or latitude in (None, ""):
        raise ValueError("Longitude et latitude sont obligatoires lorsque la géométrie est absente.")
    return Point(float(longitude), float(latitude), srid=4326)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def import_centres(request):
    upload = request.FILES.get("file")
    mapping_text = request.data.get("mapping")
    if not upload or not mapping_text:
        return JsonResponse({"error": "Le fichier et le mapping sont obligatoires."}, status=400)
    try:
        mapping = json.loads(mapping_text)
        _, _, rows = _read_import(upload)
    except (ValueError, json.JSONDecodeError, zipfile.BadZipFile) as error:
        return JsonResponse({"error": str(error)}, status=400)

    required = ("libelle_centre", "code_categorie")
    missing = [field for field in required if not mapping.get(field)]
    if missing:
        return JsonResponse({"error": f"Mapping obligatoire manquant : {', '.join(missing)}."}, status=400)

    imported, errors = 0, []
    for index, row in enumerate(rows, start=2):
        try:
            name = _value(row, mapping, "libelle_centre")
            category_value = _value(row, mapping, "code_categorie")
            if not name or category_value in (None, ""):
                raise ValueError("Nom du centre et catégorie obligatoires.")
            try:
                category = Categorie.objects.get(code_categorie=int(category_value))
            except (ValueError, Categorie.DoesNotExist):
                category = Categorie.objects.filter(
                    libelle_categorie__iexact=str(category_value).strip()
                ).first() or Categorie.objects.get(
                    abreviation__iexact=str(category_value).strip()
                )
            point = _point_from_row(row, mapping)
            sousprefecture = SousPrefecture.objects.filter(geometry__covers=point).first()
            if not sousprefecture:
                raise ValueError("Point situé hors d'une sous-préfecture.")
            contact = _value(row, mapping, "contact_centre") or None
            CentreSante.objects.create(
                libelle_centre=str(name).strip(),
                contact_centre=str(contact).strip() if contact else None,
                code_categorie=category,
                code_souspref=sousprefecture,
                latitude=point.y,
                longitude=point.x,
                geometry=point,
            )
            imported += 1
        except Exception as error:
            errors.append({"ligne": index, "erreur": str(error)})

    return JsonResponse({"importes": imported, "erreurs": errors, "total": len(rows)}, status=201 if imported else 400)
