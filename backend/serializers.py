from rest_framework import serializers

from .models import Utilisateur


class RegisterUtilisateurSerializer(serializers.ModelSerializer):
    """
    Serializer permettant la création d'un utilisateur.
    """

    # Le mot de passe est uniquement accepté en écriture
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={"input_type": "password"}
    )

    class Meta:
        model = Utilisateur

        fields = (
            "num_utilisateur",
            "first_name",
            "last_name",
            "email",
            "telephone_utilisateur",
            "photo",
            "password",
            "code_role",
        )

        read_only_fields = (
            "num_utilisateur",
        )

        extra_kwargs = {
            "email": {
                "required": True
            },
            "code_role": {
                "required": False,
                "allow_null": True
            }
        }

    def validate_email(self, value):
        """
        Vérifie que l'adresse e-mail est unique.
        """
        if Utilisateur.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "Cette adresse e-mail existe déjà."
            )

        return value.lower()

    def validate_telephone_utilisateur(self, value):
        """
        Vérifie que le numéro de téléphone est unique.
        """
        if Utilisateur.objects.filter(
            telephone_utilisateur=value
        ).exists():
            raise serializers.ValidationError(
                "Ce numéro de téléphone existe déjà."
            )

        return value

    def create(self, validated_data):
        """
        Création de l'utilisateur à l'aide du CustomUserManager.
        """

        password = validated_data.pop("password")

        user = Utilisateur.objects.create_user(
            password=password,
            **validated_data
        )

        return user