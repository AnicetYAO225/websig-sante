from django.urls import path
from . import views


app_name = "frontend"

urlpatterns = [
    path("", views.accueil, name="accueil"),
    path("auth/", views.auth, name="auth"),
    path("auth/admin/", views.admin, name="admin"),
    path("auth/login/", views.connexion, name="connexion"),
    path("auth/logout/", views.deconnexion,name="logout"),
]
