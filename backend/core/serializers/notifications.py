"""Serializer de lecture des notifications de l'utilisateur connecté."""

from rest_framework import serializers

from core.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model  = Notification
        fields = ('id', 'type', 'type_display', 'titre', 'message', 'lien', 'lu', 'created_at')
        read_only_fields = fields
