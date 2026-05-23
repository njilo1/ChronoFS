from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from filieres.models import Departement
from .models import SessionPlanification, ImportDepartement
from .serializers import SessionPlanificationSerializer, ImportDepartementSerializer


class SessionPlanificationViewSet(viewsets.ModelViewSet):
    """
    API CRUD pour les sessions de planification hebdomadaire.

    À la création d'une session, une ligne ImportDepartement vide est créée
    automatiquement pour chaque département existant — afin que l'admin
    puisse suivre les imports attendus.
    """

    queryset = (
        SessionPlanification.objects
        .prefetch_related('imports__departement', 'matieres', 'emplois_du_temps')
        .all()
    )
    serializer_class   = SessionPlanificationSerializer
    permission_classes = [AllowAny]

    filterset_fields = ['etat', 'semestre', 'annee_academique']
    ordering_fields  = ['semaine_debut', 'cree_le']
    search_fields    = ['libelle', 'annee_academique']

    @transaction.atomic
    def perform_create(self, serializer):
        """Créer la session ET les lignes d'import vides pour chaque dept."""
        session = serializer.save()
        departements = Departement.objects.all()
        ImportDepartement.objects.bulk_create([
            ImportDepartement(session=session, departement=d)
            for d in departements
        ])

    # GET /api/sessions/active/ → la session ouverte la plus récente (en collecte ou prête)
    @action(detail=False, methods=['get'])
    def active(self, request):
        session = (
            SessionPlanification.objects
            .filter(etat__in=['collecte', 'pret'])
            .order_by('-semaine_debut')
            .first()
        )
        if not session:
            return Response(
                {'detail': 'Aucune session active. Créez-en une nouvelle.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(SessionPlanificationSerializer(session).data)

    # GET /api/sessions/<pk>/dashboard/ → tableau de bord des imports
    @action(detail=True, methods=['get'])
    def dashboard(self, request, pk=None):
        session = self.get_object()
        imports = (
            session.imports
            .select_related('departement')
            .order_by('departement__code')
        )

        importes  = [i for i in imports if i.importe]
        manquants = [i for i in imports if not i.importe]
        tous_prets = len(manquants) == 0 and len(importes) > 0

        # Bascule auto vers l'état 'pret' si tous les depts ont importé
        if tous_prets and session.etat == 'collecte':
            session.etat = 'pret'
            session.save(update_fields=['etat'])

        return Response({
            'session':    SessionPlanificationSerializer(session).data,
            'importes':   ImportDepartementSerializer(importes, many=True).data,
            'manquants':  ImportDepartementSerializer(manquants, many=True).data,
            'tous_prets': tous_prets,
            'nb_total':   len(imports),
            'nb_faits':   len(importes),
            'nb_manque':  len(manquants),
        })

    # POST /api/sessions/<pk>/publier/ → marquer comme publié
    @action(detail=True, methods=['post'])
    def publier(self, request, pk=None):
        session = self.get_object()
        if session.etat != 'genere':
            return Response(
                {'error': "Seul un planning généré peut être publié."},
                status=400,
            )
        session.etat      = 'publie'
        session.publie_le = timezone.now()
        session.save(update_fields=['etat', 'publie_le'])
        return Response(SessionPlanificationSerializer(session).data)

    # POST /api/sessions/<pk>/archiver/ → marquer comme archivé (retiré de l'UI active)
    @action(detail=True, methods=['post'])
    def archiver(self, request, pk=None):
        session = self.get_object()
        session.etat = 'archive'
        session.save(update_fields=['etat'])
        return Response(SessionPlanificationSerializer(session).data)


class ImportDepartementViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Lecture seule des lignes d'import. La création se fait automatiquement
    via SessionPlanification.perform_create. La mise à jour se fait via
    POST /api/matieres/import/.
    """

    queryset = (
        ImportDepartement.objects
        .select_related('session', 'departement')
        .all()
    )
    serializer_class   = ImportDepartementSerializer
    permission_classes = [AllowAny]

    filterset_fields = ['session', 'departement']
