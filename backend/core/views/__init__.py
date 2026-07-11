"""Réexport unifié des vues FSChrono pour brancher dans urls.py."""

from .auth import ChangePasswordView, LoginView, MeView, RefreshView
from .chefs import ChefDeptViewSet
from .mon_departement import (
    MesEnseignantsViewSet,
    MesFilieresViewSet,
    MesIndisponibilitesViewSet,
    MesUEsViewSet,
)
from .referentiel import (
    AnneeAcademiqueViewSet,
    CampusViewSet,
    DepartementViewSet,
    EnseignantViewSet,
    FiliereViewSet,
    SalleViewSet,
    UEViewSet,
)
from .semaines import SemaineViewSet
from .imports import (
    ImportPlanningViewSet,
    ImportPreviewView,
    TemplateExcelView,
)
from .seances import PlanningActuelView, SeanceViewSet
from .notifications import NotificationViewSet
from .configuration import (
    FonctionObjectifViewSet,
    JournalGenerationViewSet,
    RegleSolverViewSet,
    StatsSuperAdminView,
)
from .comptes import CompteViewSet


__all__ = [
    # Auth
    'LoginView', 'RefreshView', 'MeView', 'ChangePasswordView',
    # Référentiel DAR
    'CampusViewSet', 'SalleViewSet',
    'DepartementViewSet', 'FiliereViewSet',
    'EnseignantViewSet', 'UEViewSet',
    'AnneeAcademiqueViewSet',
    # Chefs (DAR)
    'ChefDeptViewSet',
    # Mon département (chef)
    'MesUEsViewSet', 'MesEnseignantsViewSet', 'MesFilieresViewSet',
    'MesIndisponibilitesViewSet',
    # Hebdomadaire
    'SemaineViewSet',
    # Imports
    'ImportPlanningViewSet', 'ImportPreviewView', 'TemplateExcelView',
    # Séances
    'SeanceViewSet', 'PlanningActuelView',
    # Notifications
    'NotificationViewSet',
    # Configuration solver (super-admin)
    'RegleSolverViewSet', 'FonctionObjectifViewSet',
    'JournalGenerationViewSet', 'StatsSuperAdminView',
    # Comptes (super-admin)
    'CompteViewSet',
]
