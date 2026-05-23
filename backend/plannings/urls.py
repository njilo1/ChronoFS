from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import EmploiDuTempsViewSet, CreneauViewSet, CreneauExamenViewSet, ExportPDFView

router = DefaultRouter()
router.register(r'emplois-du-temps', EmploiDuTempsViewSet)
router.register(r'creneaux',         CreneauViewSet)
router.register(r'creneaux-examen',  CreneauExamenViewSet)

urlpatterns = router.urls + [
    path('emplois-du-temps/<int:pk>/export-pdf/', ExportPDFView.as_view(), name='export-pdf'),
]
