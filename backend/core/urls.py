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
    LoginView,
    MeView,
    MesEnseignantsViewSet,
    MesUEsViewSet,
    RefreshView,
    SalleViewSet,
    SemaineViewSet,
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

    # Router principal (référentiel DAR + semaines + chefs-departement)
    path('', include(router.urls)),
]
