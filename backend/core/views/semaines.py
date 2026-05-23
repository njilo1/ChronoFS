"""
ViewSet pour les Semaines (CRUD basique).

En Phase 2 on expose uniquement le CRUD et les filtres. Les actions
métier viendront :
- Phase 3 : `/imports/` rattachés à la semaine, clôture des imports
- Phase 4 : `POST /semaines/<id>/generer/` (solver)
- Phase 5 : `POST /semaines/<id>/export-pdf/` + archives

DAR : CRUD complet. Chef : lecture seule (utile pour savoir vers quelle
semaine envoyer son fichier).
"""

from rest_framework import viewsets

from core.models import Semaine
from core.permissions import IsDARorReadOnly
from core.serializers import SemaineSerializer


class SemaineViewSet(viewsets.ModelViewSet):
    queryset           = Semaine.objects.select_related('annee_academique').all()
    serializer_class   = SemaineSerializer
    permission_classes = [IsDARorReadOnly]
    filterset_fields   = ['statut', 'semestre', 'annee_academique']
    ordering_fields    = ['date_debut']
    ordering           = ['-date_debut']
