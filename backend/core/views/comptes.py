"""
Gestion des comptes DAR + Chef de département par le SUPER-ADMINISTRATEUR.

Mêmes garanties que la gestion des chefs par le DAR : à la création / au reset
sans mot de passe, un mot de passe est généré et renvoyé EN CLAIR une seule fois.
"""

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.constants import Role, TypeNotification
from core.models import User
from core.permissions import IsSuperAdmin
from core.serializers.comptes import CompteCreateSerializer, CompteSerializer
from core.serializers.users import ResetPasswordSerializer, _generer_mot_de_passe
from core.services.notifications import notifier


class CompteViewSet(viewsets.ModelViewSet):
    """CRUD des comptes DAR et Chef de département (super-admin uniquement)."""

    permission_classes = [IsSuperAdmin]
    filterset_fields   = ['role', 'departement', 'is_active']
    search_fields      = ['username', 'last_name', 'first_name']
    ordering_fields    = ['username', 'role', 'date_joined']
    ordering           = ['role', 'username']

    def get_queryset(self):
        # Le super-admin gère les DAR et les chefs (pas les autres super-admins).
        return (
            User.objects
            .filter(role__in=[Role.DAR, Role.CHEF_DEPT])
            .select_related('departement')
        )

    def get_serializer_class(self):
        if self.action == 'create':
            return CompteCreateSerializer
        return CompteSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        compte = serializer.save()

        notifier(
            [compte],
            TypeNotification.COMPTE_CREE,
            titre="Bienvenue sur ChronoFS",
            message="Votre compte a été créé par l'administration.",
            lien='/',
        )

        data = CompteSerializer(compte).data
        pwd = getattr(compte, '_password_generated', None)
        if pwd:
            data['mot_de_passe_genere'] = pwd
        return Response(data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        compte = self.get_object()
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        nouveau = serializer.validated_data.get('nouveau_password') or _generer_mot_de_passe()
        compte.set_password(nouveau)
        compte.save(update_fields=['password'])

        notifier(
            [compte],
            TypeNotification.MOT_DE_PASSE_RESET,
            titre="Mot de passe réinitialisé",
            message="Votre mot de passe a été réinitialisé par l'administration.",
            lien='/',
        )
        return Response({
            'id':                  compte.id,
            'username':            compte.username,
            'mot_de_passe_genere': nouveau,
            'message':             "Communiquez ce mot de passe par un canal de confiance ; "
                                   "il ne sera plus jamais affiché.",
        })
