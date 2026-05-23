from rest_framework.routers import DefaultRouter
from .views import CampusViewSet, SalleViewSet

router = DefaultRouter()
router.register(r'campus', CampusViewSet)
router.register(r'salles', SalleViewSet)

urlpatterns = router.urls
