"""
Vues d'authentification.

- LoginView (POST /api/auth/login/)    : compatible TokenObtainPair mais
  renvoie en plus l'objet `user` complet en réponse.
- RefreshView (POST /api/auth/refresh/): identique à TokenRefreshView.
- MeView (GET /api/auth/me/)            : profil de l'utilisateur connecté.
"""

from drf_spectacular.utils import OpenApiExample, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from core.serializers import LoginSerializer, MeSerializer


@extend_schema(
    summary="Connexion (DAR ou chef de département)",
    description=(
        "Renvoie un access token (1 h), un refresh token (7 j) ET l'objet "
        "user complet pour éviter un appel /me/ immédiatement après."
    ),
    examples=[
        OpenApiExample(
            'DAR',
            value={'username': 'dar', 'password': 'dar123'},
            request_only=True,
        ),
        OpenApiExample(
            'Chef TIC',
            value={'username': 'chef_tic', 'password': 'tic123'},
            request_only=True,
        ),
    ],
)
class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer


@extend_schema(summary="Rafraîchir le token d'accès")
class RefreshView(TokenRefreshView):
    """Identique au TokenRefreshView de simplejwt. Aliasé pour cohérence d'URL."""


@extend_schema(
    summary="Profil de l'utilisateur connecté",
    description="Renvoie l'objet user du porteur du token JWT (DAR ou chef).",
    responses={200: MeSerializer},
)
class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(MeSerializer(request.user).data)
