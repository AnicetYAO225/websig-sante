from django.contrib.auth.models import BaseUserManager


class CustomUserManager(BaseUserManager):

    # Méthode permettant de créer un utilisateur
    def create_user(
        self,
        # Adresse email pour s'authentifier
        email,

        # Mot de passe pour s'authentifier
        password=None,

        # Rôle utilisateur
        code_role=None,

        # Dictionnaire contenant les autres champs du modèle
        **extra_fields
    ):

        # Vérifier que l'adresse e-mail est renseignée
        if not email:
            raise ValueError(
                "L'adresse email n'est pas fournie"
            )


        # Normaliser l'adresse email
        email = self.normalize_email(email)


        # Créer l'utilisateur
        user = self.model(
            email=email,
            code_role=code_role,
            **extra_fields
        )


        # Chiffrer le mot de passe
        user.set_password(password)


        # Enregistrer l'utilisateur dans la base de données
        user.save(using=self._db)


        # Retourner obligatoirement l'utilisateur créé
        return user



    # Méthode permettant de créer un super administrateur
    def create_superuser(
        self,

        # Adresse email
        email,

        # Mot de passe
        password=None,

        # Rôle utilisateur
        code_role=None,

        # Autres champs
        **extra_fields
    ):


        # Donner les droits administrateur
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


        # Vérification de sécurité
        if extra_fields.get("is_staff") is not True:
            raise ValueError(
                "Le super utilisateur doit avoir is_staff=True"
            )


        if extra_fields.get("is_superuser") is not True:
            raise ValueError(
                "Le super utilisateur doit avoir is_superuser=True"
            )


        # Appel de create_user()
        return self.create_user(
            email=email,
            password=password,
            code_role=code_role,
            **extra_fields
        )