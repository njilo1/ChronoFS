"""
Vues pour les Seance (résultat du solver).

- SeanceViewSet : lecture pour tous les authentifiés (le chef voit le
                  planning final de la semaine pour information), PATCH
                  réservé au DAR avec audit.
- Action `@seances` sur SemaineViewSet pour récupérer les séances
  d'une semaine directement.
- PlanningActuelView : raccourci /api/planning-actuel/ qui renvoie le
                  planning de la semaine la plus récente publiée (ou
                  générée à défaut), filtré au département du chef.
"""

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.constants import Role, StatutSemaine
from core.models import Seance, Semaine
from core.serializers import SeanceEditSerializer, SeanceSerializer, SemaineSerializer


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


class PlanningActuelView(APIView):
    """
    GET /api/planning-actuel/

    Renvoie le planning "en vigueur" pour l'utilisateur connecté :
      - la semaine la plus récente en statut PUBLIE (la version officielle
        que les étudiants consultent) ;
      - à défaut, la plus récente en statut GENERE (déjà calculée mais pas
        encore publiée par le DAR).

    Pour un chef de département, les séances sont automatiquement filtrées
    sur son département. Pour le DAR, toutes les séances de la semaine
    sont retournées.

    Réponse :
        {
          "semaine": { ... } | null,
          "seances": [ ... ]
        }

    Si aucune semaine PUBLIE ou GENERE n'existe, semaine=None et la
    liste de séances est vide — le frontend affichera un état "rien à
    voir".
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        semaine = (
            Semaine.objects
            .filter(statut__in=(StatutSemaine.PUBLIE, StatutSemaine.GENERE))
            .select_related('annee_academique')
            # PUBLIE prioritaire sur GENERE, puis la plus récente.
            .extra(select={'rang_statut': (
                "CASE statut WHEN 'PUBLIE' THEN 0 WHEN 'GENERE' THEN 1 ELSE 2 END"
            )})
            .order_by('rang_statut', '-date_debut')
            .first()
        )

        if semaine is None:
            return Response({'semaine': None, 'seances': []})

        seances_qs = (
            Seance.objects
            .filter(semaine=semaine)
            .select_related('filiere', 'ue', 'enseignant', 'salle__campus')
            .order_by('jour', 'creneau', 'salle__nom')
        )
        # Le chef ne voit que les séances de SES filières.
        if request.user.role == Role.CHEF_DEPT:
            seances_qs = seances_qs.filter(
                filiere__departement_id=request.user.departement_id,
            )

        return Response({
            'semaine': SemaineSerializer(semaine).data,
            'seances': SeanceSerializer(seances_qs, many=True).data,
        })
