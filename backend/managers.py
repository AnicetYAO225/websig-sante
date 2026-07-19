# on a creer un fichier managers.py pour gerer la partie utlisateur et tout ce qui est authentification

# appeler la dependance de django et on va modifier apres
from django.contrib.auth.models import BaseUserManager


# personnaliser la methode d'authentification de django pour nous meme vu qu'on n'utilise pas
class customUserManager(BaseUserManager):

    # Méthode permettant de creer l'utilisateur
    def create_user(
        self,

        # Adresse email pour s'identifier/authentifier
        email,
        password=None,

        # Role de l'utilisateur
        code_role=None,

        # chemin/dictionnaire contenant les autres champs du model et permet d'appeler les autres champs
        **extra_fields

    ):
        # verifier que l'adresse email est renseignée
        if not email:

            # si le mail n'est pas fourni, lever une exception
            raise ValueError(
                "L'adresse email n'est pas fournie"
            )

        # Normaliser l'adresse email pour dire que c'est vraiment une adresse email
        email = self.normalize_email(email)

        # creer l'utilisateur
        user = self.model(
            email=email,
            code_role=code_role,
            **extra_fields
        )

        # Stocker le mot de passe
        user.set_password(password)

        # enregistrer l'utilisateur dans la base de données
        user.save(using=self._db)

        return user

    # creer le super utilisateur (admin)
    def create_superuser(
        self,

        # Adresse pour s'identifier
        email,
        password=None,

        # Role de l'utilisateur
        code_role=None,

        # Dictionnaire contenant les autres champs du model
        **extra_fields
    ):

        # permet de definir un super utilisateur s'il n'est pas encore créé
        extra_fields.setdefault(
            "is_staff",
            True
        )

        extra_fields.setdefault(
            "is_superuser",
            True
        )

        extra_fields.setdefault(
            "is_active",
            True
        )

        # appeler notre fonction create_user qui a été définie en haut
        return self.create_user(

            # Adresse pour s'identifier
            email=email,
            password= None,

            # Role de l'utilisateur
            code_role= None,

            # chemin contenant les autres champs du model
            **extra_fields

        )
        
        
       