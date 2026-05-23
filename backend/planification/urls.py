from rest_framework.routers import DefaultRouter
from .views import SessionPlanificationViewSet, ImportDepartementViewSet

router = DefaultRouter()
router.register(r'sessions',          SessionPlanificationViewSet, basename='session')
router.register(r'imports-dept',      ImportDepartementViewSet,    basename='import-dept')

urlpatterns = router.urls
