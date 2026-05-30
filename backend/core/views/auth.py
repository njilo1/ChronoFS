"""
Vues d'authentification.

- LoginView (POST /api/auth/login/)    : compatible TokenObtainPair mais
  renvoie en plus l'objet `user` complet en réponse.
- RefreshView (POST /api/auth/refresh/): identique à TokenRefreshView.
- MeView (GET/PATCH /api/auth/me/)      : profil de l'utilisateur connecté
  (consultation + modification de ses propres informations).
- ChangePasswordView (POST /api/auth/change-password/) : l'utilisateur change
  son propre mot de passe (ancien requis) ; renvoie de nouveaux tokens.
"""

from drf_spectacular.utils import OpenApiExample, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from core.serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    MeSerializer,
    ProfilUpdateSerializer,
)


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

    @extend_schema(
        summary="Modifier son propre profil",
        description=(
            "Met à jour les informations de l'utilisateur connecté "
            "(nom d'utilisateur, identité, coordonnées). Le rôle et le "
            "département ne sont pas modifiables ici."
        ),
        request=ProfilUpdateSerializer,
        responses={200: MeSerializer},
    )
    def patch(self, request):
        # On modifie TOUJOURS request.user — jamais un compte ciblé par id.
        serializer = ProfilUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(MeSerializer(request.user).data)


@extend_schema(
    summary="Changer son propre mot de passe",
    description=(
        "Vérifie l'ancien mot de passe, applique les validateurs Django au "
        "nouveau, puis renvoie de nouveaux tokens (la session reste valide "
        "sans nouvelle connexion)."
    ),
    request=ChangePasswordSerializer,
)
class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.set_password(serializer.validated_data['nouveau_password'])
        user.save(update_fields=['password'])

        # Nouveaux tokens : évite que l'access token courant (lié à l'ancien
        # état) ne pose problème et offre une session fraîche au frontend.
        refresh = RefreshToken.for_user(user)
        return Response({
            'access':  str(refresh.access_token),
            'refresh': str(refresh),
        })
