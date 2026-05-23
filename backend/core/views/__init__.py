"""Réexport unifié des vues FSChrono pour brancher dans urls.py."""

from .auth import LoginView, MeView, RefreshView
from .chefs import ChefDeptViewSet
from .mon_departement import MesEnseignantsViewSet, MesUEsViewSet
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


__all__ = [
    # Auth
    'LoginView', 'RefreshView', 'MeView',
    # Référentiel DAR
    'CampusViewSet', 'SalleViewSet',
    'DepartementViewSet', 'FiliereViewSet',
    'EnseignantViewSet', 'UEViewSet',
    'AnneeAcademiqueViewSet',
    # Chefs (DAR)
    'ChefDeptViewSet',
    # Mon département (chef)
    'MesUEsViewSet', 'MesEnseignantsViewSet',
    # Hebdomadaire
    'SemaineViewSet',
]
