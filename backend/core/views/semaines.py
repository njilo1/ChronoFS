"""
ViewSet pour les Semaines (CRUD + actions DAR).

Actions implémentées :
- Phase 2 : CRUD basique
- Phase 3 : @cloturer_imports — passe la semaine en IMPORTS_CLOTURES
            pour empêcher de nouveaux envois avant la génération
- Phase 4 : @generer (solver OR-Tools)
- Phase 5 : @export_pdf, @export_docx

DAR : CRUD complet. Chef : lecture seule (utile pour savoir vers quelle
semaine envoyer son fichier).
"""

from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.constants import StatutSemaine
from core.models import Semaine
from core.permissions import IsDAR, IsDARorReadOnly
from core.serializers import SemaineSerializer


class SemaineViewSet(viewsets.ModelViewSet):
    queryset           = Semaine.objects.select_related('annee_academique').all()
    serializer_class   = SemaineSerializer
    permission_classes = [IsDARorReadOnly]
    filterset_fields   = ['statut', 'semestre', 'annee_academique']
    ordering_fields    = ['date_debut']
    ordering           = ['-date_debut']

    # ── Clôture des imports (DAR) ────────────────────────────────────────────
    @extend_schema(
        summary="Clôturer les imports : aucun chef ne peut plus envoyer ni modifier",
        description=(
            "Verrouille la semaine en statut IMPORTS_CLOTURES. À utiliser "
            "juste avant le lancement du solver (Phase 4)."
        ),
        responses={200: SemaineSerializer},
    )
    @action(detail=True, methods=['post'], url_path='cloturer-imports', permission_classes=[IsDAR])
    def cloturer_imports(self, request, pk=None):
        semaine = self.get_object()

        if semaine.statut not in (StatutSemaine.DRAFT, StatutSemaine.IMPORTS_OUVERTS):
            return Response(
                {'detail': f"Cette semaine est déjà « {semaine.get_statut_display()} ». "
                           "La clôture n'est plus pertinente."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        semaine.statut = StatutSemaine.IMPORTS_CLOTURES
        semaine.save(update_fields=['statut'])

        return Response(SemaineSerializer(semaine).data)
