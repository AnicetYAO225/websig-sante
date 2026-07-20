from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.contrib.messages import get_messages

# Create your views here.
# Vue principale 
def accueil(request):
    return render(request, "carte.html",{
        "title": "WebSIG - couverture sanitaire de la Côte d'Ivoire",
    })
   
# Vue de connexion     
def auth(request):
    return render(request, "login.html",{
        "title": "WebSIG - Connexion",
    })
    
 
   
# Vue de admin
@login_required     
def admin(request):
    return render(request, "admin.html",{
        "title": "WebSIG - Administration",
    })
    
    
# connexion
def connexion(request):
    
    if request.method == "POST":

        
        email = request.POST.get("email")
        password = request.POST.get("password")
        utilisateur = authenticate(
            request,
            email=email,
            password=password
        )


        if utilisateur is not None:
            login(
                request,
                utilisateur
            )
            return redirect(
                "/auth/admin/"
            )
            
        storage = get_messages(request)
        for _ in storage:
            pass
        
        messages.error(
            request,
            "Email ou mot de passe incorrect."
        )


    return render(
        request,
        "login.html"
    )
    
    
# Déconnexion
@login_required  
def deconnexion(request):
    
    logout(request)

    return redirect("/auth/")