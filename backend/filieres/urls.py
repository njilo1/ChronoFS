from rest_framework.routers import DefaultRouter
from .views import DepartementViewSet, FiliereViewSet, NiveauViewSet

router = DefaultRouter()

# Chaque register crée automatiquement les routes GET/POST/PUT/DELETE
# Ex: router.register('departements', ...) crée :
#   GET    /api/departements/       → liste
#   POST   /api/departements/       → créer
#   GET    /api/departements/{id}/  → détail
#   PUT    /api/departements/{id}/  → modifier
#   DELETE /api/departements/{id}/  → supprimer
router.register(r'departements', DepartementViewSet)
router.register(r'filieres',     FiliereViewSet)
router.register(r'niveaux',      NiveauViewSet)

urlpatterns = router.urls
