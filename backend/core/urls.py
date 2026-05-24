"""
URLs métier FSChrono.

Branchées dans `config/urls.py` sous le préfixe `/api/`.

Conventions :
- Référentiel DAR sous /api/<ressource>/        (kebab-case)
- Endpoints chef sous /api/mon-departement/...
- Gestion des chefs sous /api/chefs-departement/...
- Auth sous /api/auth/login|refresh|me/
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from core.views import (
    AnneeAcademiqueViewSet,
    CampusViewSet,
    ChefDeptViewSet,
    DepartementViewSet,
    EnseignantViewSet,
    FiliereViewSet,
    ImportPlanningViewSet,
    ImportPreviewView,
    LoginView,
    MeView,
    MesEnseignantsViewSet,
    MesUEsViewSet,
    RefreshView,
    SalleViewSet,
    SeanceViewSet,
    SemaineViewSet,
    TemplateExcelView,
    UEViewSet,
)


# ── Router principal (DAR) ───────────────────────────────────────────────────
router = DefaultRouter()
router.register('campus',              CampusViewSet,           basename='campus')
router.register('salles',              SalleViewSet,            basename='salle')
router.register('departements',        DepartementViewSet,      basename='departement')
router.register('filieres',            FiliereViewSet,          basename='filiere')
router.register('enseignants',         EnseignantViewSet,       basename='enseignant')
router.register('ues',                 UEViewSet,               basename='ue')
router.register('annees-academiques',  AnneeAcademiqueViewSet,  basename='annee')
router.register('semaines',            SemaineViewSet,          basename='semaine')
router.register('chefs-departement',   ChefDeptViewSet,         basename='chef-dept')
router.register('imports',             ImportPlanningViewSet,   basename='import')
router.register('seances',             SeanceViewSet,           basename='seance')


# ── Router secondaire (chef de département) ──────────────────────────────────
router_chef = DefaultRouter()
router_chef.register('ues',          MesUEsViewSet,          basename='mes-ues')
router_chef.register('enseignants',  MesEnseignantsViewSet,  basename='mes-enseignants')


urlpatterns = [
    # Authentification
    path('auth/login/',   LoginView.as_view(),   name='auth-login'),
    path('auth/refresh/', RefreshView.as_view(), name='auth-refresh'),
    path('auth/me/',      MeView.as_view(),      name='auth-me'),

    # Endpoints chef de département (montés sous /mon-departement/)
    path('mon-departement/', include(router_chef.urls)),

    # Imports — endpoints non-routables par DefaultRouter
    path('template-excel/',    TemplateExcelView.as_view(),  name='template-excel'),
    path('imports/preview/',   ImportPreviewView.as_view(),  name='imports-preview'),

    # Router principal (référentiel DAR + semaines + chefs-departement + imports)
    path('', include(router.urls)),
]
