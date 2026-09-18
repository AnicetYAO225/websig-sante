from django.urls import path
from django.contrib.auth import views as auth_views
from . import views


app_name = "frontend"

urlpatterns = [
    path("", views.accueil, name="accueil"),
    path("auth/", views.auth, name="auth"),
    path("auth/admin/", views.admin, name="admin"),
    path("auth/login/", views.connexion, name="connexion"),
    path("auth/logout/", views.deconnexion,name="logout"),
    path("auth/mot-de-passe-oublie/", auth_views.PasswordResetView.as_view(template_name="registration/password_reset_form.html", email_template_name="registration/password_reset_email.txt", html_email_template_name="registration/password_reset_email.html", success_url="/auth/mot-de-passe-oublie/envoye/"), name="password_reset"),
    path("auth/mot-de-passe-oublie/envoye/", auth_views.PasswordResetDoneView.as_view(template_name="registration/password_reset_done.html"), name="password_reset_done"),
    path("auth/reinitialisation/<uidb64>/<token>/", auth_views.PasswordResetConfirmView.as_view(template_name="registration/password_reset_confirm.html", success_url="/auth/reinitialisation/terminee/"), name="password_reset_confirm"),
    path("auth/reinitialisation/terminee/", auth_views.PasswordResetCompleteView.as_view(template_name="registration/password_reset_complete.html"), name="password_reset_complete"),
]
