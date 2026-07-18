"""Réexport unifié des serializers FSChrono."""

from .auth import (
    ChangePasswordSerializer,
    LoginSerializer,
    MeSerializer,
    ProfilUpdateSerializer,
)
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
from .notifications import NotificationSerializer
from .disponibilites import IndisponibiliteSerializer
from .configuration import (
    FonctionObjectifSerializer,
    JournalGenerationSerializer,
    RegleSolverSerializer,
)
from .comptes import CompteCreateSerializer, CompteSerializer


__all__ = [
    # Auth
    'LoginSerializer', 'MeSerializer',
    'ProfilUpdateSerializer', 'ChangePasswordSerializer',
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
    # Notifications
    'NotificationSerializer',
    # Disponibilités
    'IndisponibiliteSerializer',
    # Configuration solver (super-admin)
    'RegleSolverSerializer', 'FonctionObjectifSerializer',
    'JournalGenerationSerializer',
    # Comptes (super-admin)
    'CompteSerializer', 'CompteCreateSerializer',
]
