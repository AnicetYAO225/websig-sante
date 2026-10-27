e-santé - WebSIG de la couverture sanitaire de la Côte d'Ivoire

Application WebSIG (Django / GeoDjango / PostGIS) pour visualiser et suivre la couverture sanitaire par sous-préfecture : carte interactive publique, indicateurs (population, nombre de centres, ratio, statut d'équipement) et espace d'administration sécurisé pour gérer les données.

Fonctionnalités

Carte publique (/)

Fonds de carte Esri (rues, satellite, satellite hybride)
Limites des sous-préfectures et centres de santé (clusters, popups avec catégorie, contact et services)
Filtre par catégorie de centre, recherche d'une sous-préfecture
Indicateurs clés par sous-préfecture : population, nombre de centres, ratio, statut d'équipement
Diagramme de répartition des centres par catégorie
Outils de dessin et impression de la carte

Espace d'administration (/auth/admin/, connexion requise)

Tableau de bord : sous-préfectures, population, centres, répartition par niveau d'équipement
Consultation, recherche, modification et suppression des sous-préfectures et des centres
Import de centres de santé en CSV ou Shapefile (ZIP, EPSG:4326) avec prévisualisation et mapping des colonnes ; la sous-préfecture est déterminée par la position du point
Création de comptes administrateurs, profil, changement de mot de passe
Réinitialisation du mot de passe par e-mail
Stack technique
Couche	Technologies
Backend	Django, GeoDjango, Django REST Framework
Base de données	PostgreSQL + PostGIS
Authentification	Sessions Django + CSRF, modèle utilisateur personnalisé (backend.Utilisateur)
Frontend	Templates Django, Leaflet (+ Draw, EasyPrint, MarkerCluster), Chart.js, Bootstrap 5
Traitement géospatial	GDAL/OGR, GeoPandas, Shapely, Fiona, PyProj
Déploiement	Gunicorn, WhiteNoise, Render
Structure du projet
websig-sante/
├── websig/            # Configuration Django (settings, urls, wsgi)
├── backend/           # Modèles, API REST, import de données
├── frontend/          # Vues et templates : carte, connexion, administration
│   └── templates/     # carte.html, login.html, admin.html, registration/
├── static/            # css/, js/ (carte.js, admin.js), img/
├── manage.py
└── requirements.txt

Organisation des URL
URL	Rôle	Accès
/	Carte	Public
/auth/	Page de connexion	Public
/auth/admin/	Espace d'administration	Connecté
/auth/mot-de-passe-oublie/	Réinitialisation du mot de passe	Public
/admin/	Administration Django native	Staff
/api/sous-prefectures/	GeoJSON des sous-préfectures	Public
/api/sous-prefectures/<code>/details/	Détail et rapport d'une sous-préfecture	Public
/api/centres-sante/	GeoJSON des centres	Public
/api/categories/	Catégories de centres	Public
/api/admin/...	API de gestion (tableau de bord, CRUD, import)	Connecté
/api/register/	Création d'un administrateur	Administrateur
Installation
Prérequis
Python 3.12+
PostgreSQL avec l'extension PostGIS
Bibliothèques système GDAL, GEOS et PROJ
Étapes
bash
git clone https://github.com/AnicetYAO225/websig-sante.git
cd websig-sante

python -m venv env
source env/bin/activate          # Linux / macOS
env\Scripts\activate             # Windows

pip install -r requirements.txt
Configuration

Les paramètres sensibles sont lus dans les variables d'environnement. Ne commitez jamais ces valeurs.

Variable	Description
SECRET_KEY	Clé secrète Django
DEBUG	True en local, False en production
DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT	Base PostgreSQL/PostGIS
EMAIL_HOST, EMAIL_PORT, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD, EMAIL_USE_TLS	SMTP (réinitialisation du mot de passe)
DEFAULT_FROM_EMAIL	Adresse d'expédition

Activer PostGIS sur la base :

sql
CREATE EXTENSION IF NOT EXISTS postgis;
Lancement
bash
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

Ouvrir http://127.0.0.1:8000/ pour la carte et http://127.0.0.1:8000/auth/ pour l'administration.

Import de centres de santé

Depuis l'espace d'administration, déposer un fichier :

CSV (UTF-8 ou CP1252) avec au minimum le nom, la catégorie et soit latitude/longitude, soit une géométrie
ZIP contenant un Shapefile de points en EPSG:4326

Une prévisualisation permet d'associer les colonnes du fichier aux champs de l'application. Les lignes hors d'une sous-préfecture ou invalides sont rejetées et listées.

Déploiement (Render)
bash
python manage.py collectstatic --noinput
gunicorn websig.wsgi:application

Les fichiers statiques sont servis par WhiteNoise. En production : DEBUG=False, hôte autorisé dans ALLOWED_HOSTS, CSRF_TRUSTED_ORIGINS renseigné et en-tête proxy HTTPS configuré.

### websig-sante

### Créer un environnement virtuel
    python -m venv env

### Activer l'environnement virtuel sous Linus
    source env/bin/activate

### Activer l'environnement virtuel sous windows
    env/Script/activate

### Installer les dépendances
    pip install -r requirements.txt

### Créer un projet Django
    django-admin startproject websig .

### Créer une application Django
    python3 manage.py startapp backend
    python3 manage.py startapp frontend

### Démarrer l'application 
    python3 manage.py runserver


### Créer des migrations
    python3 manage.py makemigrations backend

### Appliquer les migrations
    python3 manage.py migrate
