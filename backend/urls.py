from django.urls import path
from backend.views import *

app_name = "backend"

urlpatterns = [
    path("register/", RegisterUtilisateurAPIView.as_view(), name="register"),
    path("admin/mon-profil/", mon_profil, name="mon_profil"),
    path("admin/changer-mot-de-passe/", changer_mot_de_passe, name="changer_mot_de_passe"),
    path("sous-prefectures/",sousprefecture_geojson ,name="sous-prefectures" ),
    path("sous-prefectures/details/", sousprefectures_detail,name="sousprefectures_detail"),
    path("sous-prefectures/<int:code_souspref>/details/", sousprefecture_detail, name="sousprefecture_detail"),
    path("centres-sante/",get_centre_sante, name="centres-sante"),
    path("categories/", liste_categories, name="categories"),
    path("admin/dashboard/", admin_dashboard, name="admin_dashboard"),
    path("admin/sous-prefectures/", admin_sousprefectures, name="admin_sousprefectures"),
    path("admin/sous-prefectures/<int:code_souspref>/", admin_sousprefecture_detail, name="admin_sousprefecture_detail"),
    path("admin/centres/", admin_centres, name="admin_centres"),
    path("admin/centres/<int:code_centre>/", admin_centre_detail, name="admin_centre_detail"),
    path("admin/import-centres/preview/", import_centres_preview, name="import_centres_preview"),
    path("admin/import-centres/", import_centres, name="import_centres"),
]
