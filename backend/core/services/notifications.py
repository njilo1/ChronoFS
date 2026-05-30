"""
Helpers de création de notifications.

Centralise la logique d'envoi pour que les vues n'aient qu'à appeler
`notifier_chefs(...)` ou `notifier_dar(...)`. Création en masse (bulk) pour
limiter les requêtes lors d'un envoi groupé à tous les chefs.
"""

from datetime import timedelta

from django.utils import timezone

from core.constants import Role
from core.models import Notification, User


def notifier(destinataires, type, titre, message='', lien='', semaine=None):
    """Crée une notification pour chaque destinataire (itérable de User)."""
    objs = [
        Notification(
            destinataire=u, type=type, titre=titre,
            message=message, lien=lien, semaine=semaine,
        )
        for u in destinataires
    ]
    if objs:
        Notification.objects.bulk_create(objs)


def notifier_chefs(type, titre, message='', lien='', semaine=None):
    """Notifie tous les chefs de département actifs."""
    chefs = User.objects.filter(role=Role.CHEF_DEPT, is_active=True)
    notifier(chefs, type, titre, message, lien, semaine)


def notifier_dar(type, titre, message='', lien='', semaine=None):
    """Notifie le(s) compte(s) DAR actif(s)."""
    dar = User.objects.filter(role=Role.DAR, is_active=True)
    notifier(dar, type, titre, message, lien, semaine)


def purger_anciennes(user, jours=60):
    """Supprime les notifications LUES de plus de `jours` jours pour cet user."""
    seuil = timezone.now() - timedelta(days=jours)
    Notification.objects.filter(
        destinataire=user, lu=True, created_at__lt=seuil,
    ).delete()
