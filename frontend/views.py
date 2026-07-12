from django.shortcuts import render

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
def admin(request):
    return render(request, "admin.html",{
        "title": "WebSIG - Administration",
    })