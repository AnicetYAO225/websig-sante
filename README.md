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

## creer des migrations ( envoyer des modeles en base de données)
    python3 manage.py makemigrations backend

## Appliquer les migrations
    python3 manage.py migrate
