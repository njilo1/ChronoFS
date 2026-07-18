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
    CompteViewSet,
    DepartementViewSet,
    EnseignantViewSet,
    ChangePasswordView,
    FiliereViewSet,
    FonctionObjectifViewSet,
    ImportPlanningViewSet,
    ImportPreviewView,
    JournalGenerationViewSet,
    LoginView,
    MeView,
    MesEnseignantsViewSet,
    MesFilieresViewSet,
    MesIndisponibilitesViewSet,
    MesUEsViewSet,
    NotificationViewSet,
    PlanningActuelView,
    RefreshView,
    RegleSolverViewSet,
    SalleViewSet,
    SeanceViewSet,
    SemaineViewSet,
    StatsSuperAdminView,
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
router.register('notifications',       NotificationViewSet,     basename='notification')

# ── Configuration du solver + comptes (super-admin) ──────────────────────────
router.register('regles-solver',       RegleSolverViewSet,      basename='regle-solver')
router.register('fonctions-objectif',  FonctionObjectifViewSet, basename='fonction-objectif')
router.register('journal-generation',  JournalGenerationViewSet, basename='journal-generation')
router.register('comptes',             CompteViewSet,           basename='compte')


# ── Router secondaire (chef de département) ──────────────────────────────────
router_chef = DefaultRouter()
router_chef.register('ues',          MesUEsViewSet,          basename='mes-ues')
router_chef.register('enseignants',  MesEnseignantsViewSet,  basename='mes-enseignants')
router_chef.register('filieres',     MesFilieresViewSet,     basename='mes-filieres')
router_chef.register('indisponibilites', MesIndisponibilitesViewSet, basename='mes-indisponibilites')


urlpatterns = [
    # Authentification
    path('auth/login/',   LoginView.as_view(),   name='auth-login'),
    path('auth/refresh/', RefreshView.as_view(), name='auth-refresh'),
    path('auth/me/',      MeView.as_view(),      name='auth-me'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='auth-change-password'),

    # Endpoints chef de département (montés sous /mon-departement/)
    path('mon-departement/', include(router_chef.urls)),

    # Imports — endpoints non-routables par DefaultRouter
    path('template-excel/',    TemplateExcelView.as_view(),  name='template-excel'),
    path('imports/preview/',   ImportPreviewView.as_view(),  name='imports-preview'),

    # Planning en vigueur (semaine PUBLIE/GENERE la plus récente, filtré par dept du chef)
    path('planning-actuel/',   PlanningActuelView.as_view(), name='planning-actuel'),

    # Statistiques agrégées du tableau de bord super-admin
    path('stats-superadmin/',  StatsSuperAdminView.as_view(), name='stats-superadmin'),

    # Router principal (référentiel DAR + semaines + chefs-departement + imports)
    path('', include(router.urls)),
]
