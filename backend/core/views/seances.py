"""
Vues pour les Seance (résultat du solver).

- SeanceViewSet : lecture pour tous les authentifiés (le chef voit le
                  planning final de la semaine pour information), PATCH
                  réservé au DAR avec audit.
- Action `@seances` sur SemaineViewSet pour récupérer les séances
  d'une semaine directement.
"""

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from core.constants import Role
from core.models import Seance
from core.serializers import SeanceEditSerializer, SeanceSerializer


class SeanceViewSet(viewsets.ModelViewSet):
    """
    GET    /api/seances/                   → liste (chef : son dept, DAR : tout)
    GET    /api/seances/<id>/              → détail
    PATCH  /api/seances/<id>/              → DAR uniquement, audit auto

    POST / DELETE désactivés : on passe par /semaines/<id>/generer/.
    """

    queryset           = Seance.objects.select_related(
        'semaine', 'filiere', 'ue', 'enseignant', 'salle__campus', 'modifie_par',
    )
    permission_classes = [IsAuthenticated]
    filterset_fields   = ['semaine', 'filiere', 'salle', 'jour', 'creneau', 'type_cours']
    search_fields      = ['ue__code', 'ue__intitule', 'filiere__code']
    ordering_fields    = ['semaine', 'jour', 'creneau']
    ordering           = ['semaine', 'jour', 'creneau']
    http_method_names  = ['get', 'patch', 'head', 'options']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_authenticated and user.role == Role.CHEF_DEPT:
            # Le chef voit uniquement les séances qui concernent ses filières
            qs = qs.filter(filiere__departement_id=user.departement_id)
        return qs

    def get_serializer_class(self):
        if self.action in ('partial_update', 'update'):
            return SeanceEditSerializer
        return SeanceSerializer

    def get_permissions(self):
        if self.action in ('partial_update', 'update'):
            # Import tardif pour éviter une dépendance circulaire au load
            from core.permissions import IsDAR
            return [IsDAR()]
        return [IsAuthenticated()]
