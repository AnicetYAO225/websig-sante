from django.shortcuts import render
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny

from .serializers import RegisterUtilisateurSerializer

# Create your views here.
class RegisterUtilisateurAPIView(APIView):
    """
    API permettant de créer un nouvel utilisateur.
    """
    permission_classes = [AllowAny]
    def post(self, request, *args, **kwargs):

        serializer = RegisterUtilisateurSerializer(
            data=request.data
        )

        if serializer.is_valid():

            utilisateur = serializer.save()

            return Response(
                {
                    "message": "Utilisateur créé avec succès.",
                    "utilisateur": {
                        "num_utilisateur": utilisateur.num_utilisateur,
                        "username": utilisateur.username,
                        "first_name": utilisateur.first_name,
                        "last_name": utilisateur.last_name,
                        "email": utilisateur.email,
                        "telephone_utilisateur": utilisateur.telephone_utilisateur,
                        "photo": utilisateur.photo,
                        "code_role": (
                            utilisateur.code_role.code_role
                            if utilisateur.code_role
                            else None
                        ),
                    }
                },
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )