from django.contrib.gis.db import models
from django.contrib.auth.models import BaseUserManager, AbstractUser
from .managers import CustomUserManager

# Role Utilisateur
class RoleUtilisateur(models.Model):
    code_role = models.AutoField(primary_key=True, editable=False)
    libelle_role = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = 'role_utilisateur'
        managed = False
        verbose_name = 'rôle utilisateur'
        
    def __str__(self):
        return self.libelle_role
    
# Utilisateur
class Utilisateur(AbstractUser):
    num_utilisateur = models.AutoField(primary_key=True, editable=False)
    code_role = models.ForeignKey(
        RoleUtilisateur, on_delete=models.DO_NOTHING,
        db_column="code_role", null=True, blank=True
        )
    
    photo = models.TextField(null=True, blank=True)
        
    telephone_utilisateur = models.CharField(max_length=20, unique=True)
    
    email = models.EmailField(max_length=100, unique=True)
    
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]
    
    objects = CustomUserManager()
    
    class Meta:
        db_table = 'utilisateur'
        managed = False
        verbose_name = 'Utilisateur'
        
    def __str__(self):
        return self.email
    
# Categorie
class Categorie(models.Model):
    code_categorie = models.AutoField(
        primary_key=True, editable=False
    )

    libelle_categorie = models.CharField(
        max_length=150,
        unique=True
    )

    class Meta:
        managed = False
        db_table = "categorie"
        verbose_name = 'Catégorie'

    def __str__(self):
        return self.libelle_categorie  

# SousPrefecture
class SousPrefecture(models.Model):
    code_souspref = models.AutoField(
        primary_key=True, editable=False
    )

    libelle_souspref = models.CharField(
        max_length=150
    )

    geometry = models.MultiPolygonField(
        srid=4326,
        null=True,
        blank=True
    )

    habitant = models.IntegerField()

    class Meta:
        managed = False
        db_table = "sous_prefecture"
        verbose_name = 'Sous-préfecture'

    def __str__(self):
        return self.libelle_souspref
    
    
# Service
class Service(models.Model):
    code_service = models.AutoField(
        primary_key=True, editable=False
    )

    libelle_service = models.CharField(
        max_length=200,
        unique=True
    )

    class Meta:
        managed = False
        db_table = "service"
        verbose_name = 'service'

    def __str__(self):
        return self.libelle_service

# CentreSante
class CentreSante(models.Model):
    code_centre = models.AutoField(
        primary_key=True
    )

    libelle_centre = models.CharField(
        max_length=150
    )

    contact_centre = models.CharField(
        max_length=20,
        unique=True,
        null=True,
        blank=True
    )

    code_categorie = models.ForeignKey(
        Categorie,
        on_delete=models.DO_NOTHING,
        db_column="code_categorie",
        related_name="centres"
    )

    code_souspref = models.ForeignKey(
        SousPrefecture,
        on_delete=models.DO_NOTHING,
        db_column="code_souspref",
        related_name="centres"
    )

    geometry = models.PointField(
        srid=4326,
        null=True,
        blank=True
    )

    services = models.ManyToManyField(
        Service,
        through="Offrir",
        related_name="centres"
    )

    class Meta:
        managed = False
        db_table = "centre_sante"
        verbose_name = 'centre de santé'

    def __str__(self):
        return self.libelle_centre
    
# Offrir   
class Offrir(models.Model):
    code_centre = models.ForeignKey(
        CentreSante,
        on_delete=models.DO_NOTHING,
        db_column="code_centre"
    )

    code_service = models.ForeignKey(
        Service,
        on_delete=models.DO_NOTHING,
        db_column="code_service"
    )

    class Meta:
        managed = False
        db_table = "offrir"
        unique_together = (
            ("code_centre", "code_service"),
        )

    def __str__(self):
        return f"{self.code_centre} - {self.code_service}"
    
# resultat_du_rapport
class ResultatDuRapport(models.Model):
    
    STATUT_CHOICES = [
        ("sous_equipee", "Sous équipée"),
        ("equipee", "Équipée"),
    ]

    code_resultat = models.AutoField(
        primary_key=True
    )

    ratio = models.FloatField()

    statut = models.CharField(
        max_length=20,
        choices=STATUT_CHOICES
    )

    date_rapport = models.DateTimeField()

    nombre_centre = models.IntegerField()

    code_souspref = models.ForeignKey(
        SousPrefecture,
        on_delete=models.DO_NOTHING,
        db_column="code_souspref"
    )

    class Meta:
        managed = False
        db_table = "resultat_du_rapport"
        verbose_name = 'Résultat du rapport'

    def __str__(self):
        return f"{self.code_resultat} - {self.statut}"
