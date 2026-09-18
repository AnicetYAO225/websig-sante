from rest_framework import serializers
from .models import *


class RegisterUtilisateurSerializer(serializers.ModelSerializer):
    """
    Serializer permettant la création d'un utilisateur.
    """

    # Le mot de passe est uniquement accepté en écriture
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={"input_type": "password"}
    )

    class Meta:
        model = Utilisateur

        fields = (
            "num_utilisateur",
            "username",
            "first_name",
            "last_name",
            "email",
            "telephone_utilisateur",
            "photo",
            "password",
            "code_role",
        )

        read_only_fields = (
            "num_utilisateur",
        )

        extra_kwargs = {
            "email": {
                "required": True
            },
            "username": {
                "required": True
            },
            "code_role": {
                "required": False,
                "allow_null": True
            }
        }

    def validate_email(self, value):
        """
        Vérifie que l'adresse e-mail est unique.
        """
        if Utilisateur.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "Cette adresse e-mail existe déjà."
            )

        return value.lower()

    def validate_telephone_utilisateur(self, value):
        """
        Vérifie que le numéro de téléphone est unique.
        """
        if Utilisateur.objects.filter(
            telephone_utilisateur=value
        ).exists():
            raise serializers.ValidationError(
                "Ce numéro de téléphone existe déjà."
            )

        return value

    def create(self, validated_data):
        """
        Création de l'utilisateur à l'aide du CustomUserManager.
        """

        password = validated_data.pop("password")

        user = Utilisateur.objects.create_user(
            password=password,
            **validated_data
        )

        return user


class ProfilUtilisateurSerializer(serializers.ModelSerializer):
    """Informations modifiables du compte actuellement connecté."""

    class Meta:
        model = Utilisateur
        fields = (
            "num_utilisateur",
            "username",
            "first_name",
            "last_name",
            "email",
            "telephone_utilisateur",
            "photo",
        )
        read_only_fields = ("num_utilisateur",)

    def validate_email(self, value):
        if Utilisateur.objects.exclude(pk=self.instance.pk).filter(email=value).exists():
            raise serializers.ValidationError("Cette adresse e-mail existe déjà.")
        return value.lower()

    def validate_telephone_utilisateur(self, value):
        if Utilisateur.objects.exclude(pk=self.instance.pk).filter(telephone_utilisateur=value).exists():
            raise serializers.ValidationError("Ce numéro de téléphone existe déjà.")
        return value
    
    
class SousPrefectureSerializer(serializers.ModelSerializer):
    
    class Meta:

        model = SousPrefecture

        fields = [
            "code_souspref",
            "libelle_souspref",
            "geometry",
            "habitant"
        ]
        
        
class ServiceSerializer(serializers.ModelSerializer):

    class Meta:
        model = Service
        fields = (
            "code_service",
            "libelle_service",
        )
        
        
class CentreSanteSerializer(serializers.ModelSerializer):
    
    categorie = serializers.CharField(
        source="code_categorie.libelle_categorie",
        read_only=True
    )

    services = ServiceSerializer(
        many=True,
        read_only=True
    )

    longitude = serializers.SerializerMethodField()
    latitude = serializers.SerializerMethodField()

    class Meta:
        model = CentreSante

        fields = (
            "code_centre",
            "libelle_centre",
            "contact_centre",
            "categorie",
            "latitude",
            "longitude",
            "services",
        )

    def get_longitude(self, obj):
        if obj.geometry:
            return obj.geometry.x
        return None

    def get_latitude(self, obj):
        if obj.geometry:
            return obj.geometry.y
        return None
    

class ResultatRapportSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = ResultatDuRapport

        fields = (
            "ratio",
            "statut",
            "nombre_centre",
            "habitants_par_centre",
            "date_rapport",
        )
        
class SousPrefectureDetailSerializer(serializers.ModelSerializer):
    
    rapport = serializers.SerializerMethodField()

    centres = CentreSanteSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = SousPrefecture
        fields = (
            "code_souspref",
            "libelle_souspref",
            "habitant",
            "rapport",
            "centres",
        )

    def get_rapport(self, obj):
        rapport = obj.rapports.order_by("-date_rapport").first()

        if rapport:
            return ResultatRapportSerializer(rapport).data

        return None
        
