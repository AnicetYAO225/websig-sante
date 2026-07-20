from django.urls import path
from backend.views import *

app_name = "backend"

urlpatterns = [
    path("register/", RegisterUtilisateurAPIView.as_view(), name="register"),
    
]