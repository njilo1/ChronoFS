"""
ViewSets CRUD du référentiel stable — réservés à la DAR.

Chaque ViewSet hérite de `ModelViewSet` (CRUD complet) avec :
- `IsDAR` comme permission
- filtres exposés via `filterset_fields` (filtrage exact ?champ=valeur)
- recherche texte sur les champs pertinents (?search=...)
- ordonnancement (?ordering=...)

Les endpoints chef (`/api/mon-departement/...`) sont DANS un module
séparé (`mon_departement.py`) car ils ont une logique de filtrage et
d'autorisation différente.
"""

from rest_framework import viewsets

from core.models import (
    AnneeAcademique,
    Campus,
    Departement,
    Enseignant,
    Filiere,
    Salle,
    UE,
)
from core.permissions import IsDAR
from core.serializers import (
    AnneeAcademiqueSerializer,
    CampusSerializer,
    DepartementSerializer,
    EnseignantSerializer,
    FiliereSerializer,
    SalleSerializer,
    UESerializer,
)


class CampusViewSet(viewsets.ModelViewSet):
    queryset           = Campus.objects.all()
    serializer_class   = CampusSerializer
    permission_classes = [IsDAR]
    filterset_fields   = ['ville']
    search_fields      = ['nom']
    ordering_fields    = ['nom', 'ville']
    ordering           = ['ville', 'nom']


class SalleViewSet(viewsets.ModelViewSet):
    queryset           = Salle.objects.select_related('campus').all()
    serializer_class   = SalleSerializer
    permission_classes = [IsDAR]
    filterset_fields   = ['campus', 'campus__ville', 'type_salle', 'disponible']
    search_fields      = ['nom', 'campus__nom']
    ordering_fields    = ['nom', 'capacite']
    ordering           = ['campus', 'nom']


class DepartementViewSet(viewsets.ModelViewSet):
    queryset           = Departement.objects.all()
    serializer_class   = DepartementSerializer
    permission_classes = [IsDAR]
    search_fields      = ['code', 'nom']
    ordering_fields    = ['code', 'nom']
    ordering           = ['code']


class FiliereViewSet(viewsets.ModelViewSet):
    queryset           = Filiere.objects.select_related('departement').all()
    serializer_class   = FiliereSerializer
    permission_classes = [IsDAR]
    filterset_fields   = ['departement', 'niveau', 'ville']
    search_fields      = ['code', 'nom']
    ordering_fields    = ['code', 'niveau', 'ville', 'effectif']
    ordering           = ['departement', 'code', 'niveau']


class EnseignantViewSet(viewsets.ModelViewSet):
    queryset           = Enseignant.objects.prefetch_related('departements').all()
    serializer_class   = EnseignantSerializer
    permission_classes = [IsDAR]
    filterset_fields   = ['grade', 'departements']
    search_fields      = ['nom']
    ordering_fields    = ['nom', 'grade']
    ordering           = ['nom']


class UEViewSet(viewsets.ModelViewSet):
    queryset           = UE.objects.select_related('filiere__departement').all()
    serializer_class   = UESerializer
    permission_classes = [IsDAR]
    filterset_fields   = ['filiere', 'filiere__departement', 'filiere__niveau', 'filiere__ville']
    search_fields      = ['code', 'intitule']
    ordering_fields    = ['code', 'intitule']
    ordering           = ['code']


class AnneeAcademiqueViewSet(viewsets.ModelViewSet):
    queryset           = AnneeAcademique.objects.all()
    serializer_class   = AnneeAcademiqueSerializer
    permission_classes = [IsDAR]
    filterset_fields   = ['active']
    ordering_fields    = ['date_debut']
    ordering           = ['-date_debut']
