from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,  # connexion → retourne token
    TokenRefreshView,      # rafraîchir le token
)

urlpatterns = [
    # Interface admin Django
    path('admin/', admin.site.urls),

    # ── APIs ChronoFS ─────────────────────────────────────────
    # Chaque include() branche les URLs d'une application
    # Résultat : /api/salles/, /api/departements/, etc.
    path('api/', include('salles.urls')),
    path('api/', include('filieres.urls')),     # departements, filieres, niveaux
    path('api/', include('enseignants.urls')),  # enseignants
    path('api/', include('matieres.urls')),     # matieres
    path('api/', include('plannings.urls')),    # emplois-du-temps, creneaux
    path('api/', include('emplois.urls')),     # génération automatique
    path('api/', include('planification.urls')),  # sessions, imports-dept

    # ── Authentification JWT ───────────────────────────────────
    # POST /api/token/        → envoyer login+password, reçoit access+refresh token
    # POST /api/token/refresh/ → renouveler le token avant expiration
    path('api/token/',         TokenObtainPairView.as_view()),
    path('api/token/refresh/', TokenRefreshView.as_view()),
]