"""
URLs racine FSChrono v2.

Les routes métier seront branchées en Phase 2 via `core/urls.py`. Pour
l'instant on expose juste l'admin Django (utile en Phase 1 pour vérifier
les modèles) et la documentation OpenAPI (drf-spectacular).
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)


urlpatterns = [
    path('admin/', admin.site.urls),

    # Documentation API (sera enrichie au fur et à mesure)
    path('api/schema/',         SpectacularAPIView.as_view(),                                name='schema'),
    path('api/docs/',           SpectacularSwaggerView.as_view(url_name='schema'),           name='swagger'),
    path('api/docs/redoc/',     SpectacularRedocView.as_view(url_name='schema'),             name='redoc'),
]


# Servir les fichiers média en dev uniquement (imports Excel, archives PDF)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
