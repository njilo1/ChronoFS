"""
Notifications de l'utilisateur connecté.

- GET  /api/notifications/            → liste (récentes d'abord, paginée)
- GET  /api/notifications/compteur/   → nombre de non-lues (léger, pour le badge)
- POST /api/notifications/<id>/lire/  → marquer une notification comme lue
- POST /api/notifications/tout-lire/  → tout marquer comme lu

Toujours scopé à request.user : impossible d'accéder aux notifs d'autrui.
Purge opportuniste des notifications lues anciennes (> 60 j) à chaque liste.
"""

from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.models import Notification
from core.serializers import NotificationSerializer
from core.services.notifications import purger_anciennes


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class   = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(destinataire=self.request.user)

    def list(self, request, *args, **kwargs):
        # Nettoyage léger des anciennes notifications lues de cet utilisateur.
        purger_anciennes(request.user)
        return super().list(request, *args, **kwargs)

    @extend_schema(summary="Nombre de notifications non lues")
    @action(detail=False, methods=['get'])
    def compteur(self, request):
        n = self.get_queryset().filter(lu=False).count()
        return Response({'non_lues': n})

    @extend_schema(summary="Marquer une notification comme lue")
    @action(detail=True, methods=['post'])
    def lire(self, request, pk=None):
        notif = self.get_object()
        if not notif.lu:
            notif.lu = True
            notif.save(update_fields=['lu'])
        return Response(NotificationSerializer(notif).data)

    @extend_schema(summary="Tout marquer comme lu")
    @action(detail=False, methods=['post'], url_path='tout-lire')
    def tout_lire(self, request):
        self.get_queryset().filter(lu=False).update(lu=True)
        return Response({'detail': 'Toutes les notifications ont été marquées comme lues.'})
