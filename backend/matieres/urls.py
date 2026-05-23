from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import MatiereViewSet, ImportMatieresView

router = DefaultRouter()
router.register(r'matieres', MatiereViewSet)

# L'URL d'import doit être définie AVANT les URLs du router
# pour ne pas être confondue avec /matieres/{id}/
urlpatterns = [
    path('matieres/import/', ImportMatieresView.as_view(), name='matieres-import'),
] + router.urls
