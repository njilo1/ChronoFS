"""
Gestion des comptes chefs de département — DAR uniquement.

Le DAR peut :
- Lister les chefs                 GET    /api/chefs-departement/
- Créer un nouveau chef            POST   /api/chefs-departement/
- Modifier un chef existant        PATCH  /api/chefs-departement/<id>/
- Supprimer un chef                DELETE /api/chefs-departement/<id>/
- Réinitialiser le mot de passe    POST   /api/chefs-departement/<id>/reset-password/

À la création (POST) ou au reset, si aucun mot de passe n'est fourni,
le système en génère un et le renvoie EN CLAIR UNE SEULE FOIS dans la
réponse. Le DAR le communique au chef par un canal de confiance.
"""

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.constants import Role
from core.models import User
from core.permissions import IsDAR
from core.serializers import (
    ChefDeptCreateSerializer,
    ChefDeptSerializer,
    ResetPasswordSerializer,
)
from core.serializers.users import _generer_mot_de_passe


class ChefDeptViewSet(viewsets.ModelViewSet):
    """CRUD des chefs de département (rôle CHEF_DEPT uniquement)."""

    permission_classes = [IsDAR]
    filterset_fields   = ['departement', 'is_active']
    search_fields      = ['username', 'last_name', 'first_name']
    ordering_fields    = ['username', 'date_joined']
    ordering           = ['departement']

    def get_queryset(self):
        return (
            User.objects
            .filter(role=Role.CHEF_DEPT)
            .select_related('departement')
        )

    def get_serializer_class(self):
        if self.action == 'create':
            return ChefDeptCreateSerializer
        return ChefDeptSerializer

    def create(self, request, *args, **kwargs):
        """
        Surcharge pour renvoyer le mot de passe généré (en clair, une seule
        fois) si l'utilisateur n'en a pas fourni à la création.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        chef = serializer.save()

        data = ChefDeptSerializer(chef).data
        pwd_genere = getattr(chef, '_password_generated', None)
        if pwd_genere:
            data['mot_de_passe_genere'] = pwd_genere

        return Response(data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        """
        Régénère ou applique un nouveau mot de passe pour ce chef.

        Body optionnel : `{"nouveau_password": "..."}`. Si vide ou absent,
        un mot de passe aléatoire est généré et renvoyé une seule fois.
        """
        chef = self.get_object()

        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        nouveau = serializer.validated_data.get('nouveau_password') or _generer_mot_de_passe()
        chef.set_password(nouveau)
        chef.save(update_fields=['password'])

        return Response({
            'id':                  chef.id,
            'username':            chef.username,
            'mot_de_passe_genere': nouveau,
            'message':             "Mot de passe réinitialisé. Communiquez-le au chef "
                                   "par un canal de confiance, il ne sera plus jamais "
                                   "affiché en clair.",
        })
