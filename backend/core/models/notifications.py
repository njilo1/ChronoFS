"""
Notification — message destiné à un utilisateur lors d'une interaction entre
acteurs (le DAR ouvre une semaine, un chef envoie un planning, etc.).

État lu/non-lu persistant en base (par destinataire) → survit au rechargement
et au changement d'appareil. Voir `core/services/notifications.py` pour les
helpers de création (`notifier`, `notifier_chefs`, `notifier_dar`).
"""

from django.db import models

from core.constants import TypeNotification


class Notification(models.Model):
    destinataire = models.ForeignKey(
        'core.User',
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    type    = models.CharField(max_length=30, choices=TypeNotification.choices)
    titre   = models.CharField(max_length=160)
    message = models.TextField(blank=True)
    # Chemin frontend vers la page utile (ex. '/chef/import') pour le clic.
    lien    = models.CharField(max_length=200, blank=True)
    # Contexte facultatif (la semaine concernée).
    semaine = models.ForeignKey(
        'core.Semaine',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='notifications',
    )
    lu         = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes  = [models.Index(fields=['destinataire', 'lu', '-created_at'])]

    def __str__(self):
        return f'{self.destinataire_id} · {self.titre}'
