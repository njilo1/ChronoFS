from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from .models import Enseignant
from .serializers import EnseignantSerializer


class EnseignantViewSet(viewsets.ModelViewSet):
    """API CRUD pour les enseignants."""

    # prefetch_related pour les ManyToMany (départements)
    # et les matières enseignées — évite les requêtes en cascade
    queryset = (
        Enseignant.objects
        .prefetch_related('departements', 'matieres')
        .all()
    )
    serializer_class   = EnseignantSerializer
    permission_classes = [AllowAny]

    # Filtre : GET /api/enseignants/?est_actif=true&departements=1
    filterset_fields = ['est_actif', 'departements', 'grade']

    # Recherche texte : GET /api/enseignants/?search=kengni
    search_fields = ['nom', 'prenom', 'email', 'specialite']

    ordering_fields = ['nom', 'prenom', 'grade']
