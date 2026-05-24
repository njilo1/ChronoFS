"""Réexport unifié des serializers FSChrono."""

from .auth import LoginSerializer, MeSerializer
from .users import (
    ChefDeptCreateSerializer,
    ChefDeptSerializer,
    ResetPasswordSerializer,
)
from .referentiel import (
    AnneeAcademiqueSerializer,
    CampusSerializer,
    DepartementSerializer,
    EnseignantSerializer,
    FiliereSerializer,
    SalleSerializer,
    UESerializer,
)
from .semaines import SemaineSerializer
from .imports import (
    DemandeCoursSerializer,
    ImportPlanningHistoriqueSerializer,
    ImportPlanningSerializer,
    UploadImportSerializer,
)
from .seances import SeanceEditSerializer, SeanceSerializer
from .archives import ArchivePlanningSerializer


__all__ = [
    # Auth
    'LoginSerializer', 'MeSerializer',
    # Users
    'ChefDeptSerializer', 'ChefDeptCreateSerializer', 'ResetPasswordSerializer',
    # Référentiel
    'CampusSerializer', 'SalleSerializer',
    'DepartementSerializer', 'FiliereSerializer',
    'EnseignantSerializer', 'UESerializer',
    'AnneeAcademiqueSerializer',
    # Hebdomadaire
    'SemaineSerializer',
    # Imports
    'ImportPlanningSerializer', 'ImportPlanningHistoriqueSerializer',
    'DemandeCoursSerializer', 'UploadImportSerializer',
    # Séances
    'SeanceSerializer', 'SeanceEditSerializer',
    # Archives
    'ArchivePlanningSerializer',
]
