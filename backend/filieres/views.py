from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from .models import Departement, Filiere, Niveau
from .serializers import DepartementSerializer, FiliereSerializer, NiveauSerializer


class DepartementViewSet(viewsets.ModelViewSet):
    """API CRUD pour les départements."""

    # prefetch_related('filieres') = Django charge toutes les filières
    # de chaque département EN UNE SEULE requête SQL supplémentaire
    # (au lieu de N requêtes si on avait N départements)
    queryset = Departement.objects.prefetch_related('filieres').all()
    serializer_class = DepartementSerializer
    permission_classes = [AllowAny]  # temporaire — JWT activé à l'étape 2

    # Champs disponibles pour la recherche : GET /api/departements/?search=info
    search_fields = ['nom', 'code']

    # Champs disponibles pour le tri : GET /api/departements/?ordering=nom
    ordering_fields = ['nom', 'code']


class FiliereViewSet(viewsets.ModelViewSet):
    """API CRUD pour les filières."""

    # select_related('departement') = jointure SQL avec la table Departement
    # prefetch_related('niveaux')   = charge les niveaux en 1 requête séparée
    # Sans ça : Django ferait 1 requête par filière pour obtenir son département
    queryset = (
        Filiere.objects
        .select_related('departement', 'campus')
        .prefetch_related('niveaux')
        .all()
    )
    serializer_class = FiliereSerializer
    permission_classes = [AllowAny]

    filterset_fields = ['departement', 'campus', 'campus__ville']
    search_fields    = ['nom', 'code']
    ordering_fields  = ['nom', 'code', 'effectif']


class NiveauViewSet(viewsets.ModelViewSet):
    """API CRUD pour les niveaux (L1 à M2)."""

    # La chaîne filiere__departement = Django fait la jointure
    # Filiere → Departement en une seule requête
    queryset = (
        Niveau.objects
        .select_related('filiere__departement')
        .all()
    )
    serializer_class = NiveauSerializer
    permission_classes = [AllowAny]

    # Filtre : GET /api/niveaux/?filiere=2&nom=L1
    filterset_fields = ['filiere', 'nom']
    ordering_fields  = ['filiere', 'nom', 'effectif']
