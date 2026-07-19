from django.contrib.gis.db import models

#importer le fichier managers.py qui a ete crée

from django.contrib.auth.models import BaseUserManager, AbstractUser

# Creer un modèle
class RoleUtilisateur(models.model):
    code_role = models.AutoField(primary_key=True, editable= False)
    libelle_role = models.CharField(max_length=50, unique=True)
    
    #creer une class meta ( ce qui exite en base de données)
    # si la partie managed, on met True, ca va tout creertout dans mon postgres
    # role utilisateur
    
    class Meta:
        db_table = 'role_utilisateur'
        # si notre MPD n'est pas encore dans pgadmin , on met True devant Manage, ca va le creer automatiquement dans notre base de donnée
        managed = False
        verbose_name = 'rôle utilisateur'
        
    def __str__(self):
        return self.libelle_role
    
# utiisateur (creer un utilisateur abastrait a partir de Mangers.py)

class Utilisateur(AbstractUser):
    num_utilisateur = models.AutoField(primary_key=True, editable=False)
    code_role = models.ForeignKey(
        RoleUtilisateur, on_delete=models.DO_NOTHING, db_column=code_role,
        null=True, blank=True
        )
    photo = models.TextField(null=True, blank=True)
    
    telephone_utilisateur = models.CharField(max_length=20, unique=True)
    
    email = models.EmailField(max_length=100, unique=True)
    
    #champ à utiliser pour se connecter
    
    USERNAME_FIELD = "email"
    REQUIRED_FIELD =["username"]
    
    
    #creer table Meta pour les utilisateur
    class Meta:
        db_table = 'utilisateur'
        managed = False
        verbose_name = 'Utilisateur'
        
    def __str__(self):
        return self.email
        
        