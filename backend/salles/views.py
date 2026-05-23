from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from .models import Campus, Salle
from .serializers import CampusSerializer, SalleSerializer


class CampusViewSet(viewsets.ModelViewSet):
    """API CRUD pour les campus."""

    queryset = Campus.objects.prefetch_related('salles').all()
    serializer_class   = CampusSerializer
    permission_classes = [AllowAny]

    search_fields   = ['nom', 'code', 'ville']
    ordering_fields = ['ville', 'nom', 'code']
    filterset_fields = ['ville', 'est_principal']


class SalleViewSet(viewsets.ModelViewSet):
    """API CRUD pour les salles."""

    queryset = Salle.objects.select_related('campus').all()
    serializer_class   = SalleSerializer
    permission_classes = [AllowAny]

    filterset_fields = ['campus', 'est_disponible']
    search_fields    = ['nom']
    ordering_fields  = ['nom', 'capacite', 'campus__ville']
