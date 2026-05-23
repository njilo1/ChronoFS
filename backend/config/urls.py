"""
URLs racine FSChrono v2.

L'admin Django et la doc OpenAPI sont exposés ici. Toutes les routes
métier (référentiel, auth, semaines, chefs) sont déléguées à
`core/urls.py` sous le préfixe `/api/`.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)


urlpatterns = [
    # Interface admin Django (debug + support)
    path('admin/', admin.site.urls),

    # API métier FSChrono — voir core/urls.py
    path('api/', include('core.urls')),

    # Documentation OpenAPI (drf-spectacular)
    path('api/schema/',     SpectacularAPIView.as_view(),                      name='schema'),
    path('api/docs/',       SpectacularSwaggerView.as_view(url_name='schema'), name='swagger'),
    path('api/docs/redoc/', SpectacularRedocView.as_view(url_name='schema'),   name='redoc'),
]


# Servir les fichiers média en dev uniquement (imports Excel, archives PDF)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
