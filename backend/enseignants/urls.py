from rest_framework.routers import DefaultRouter
from .views import EnseignantViewSet

router = DefaultRouter()
router.register(r'enseignants', EnseignantViewSet)

urlpatterns = router.urls
