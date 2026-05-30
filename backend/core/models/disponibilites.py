"""
Indisponibilité d'un enseignant.

Deux formes :
- RECURRENTE : chaque semaine (ex. « jamais le lundi », « pas le créneau 7h30 »).
  → `semaine` reste null.
- PONCTUELLE : une semaine précise (ex. « absent jeudi la semaine du 8 juin »).
  → `semaine` renseignée.

`creneau` null = indisponible toute la journée. Sinon, un créneau précis.

La résolution (expansion en créneaux concrets pour une semaine donnée) est
faite par `core/services/disponibilites.py`.
"""

from django.conf import settings
from django.db import models

from core.constants import Creneau, Jour


class IndisponibiliteEnseignant(models.Model):
    class Type(models.TextChoices):
        RECURRENTE = 'RECURRENTE', 'Récurrente'
        PONCTUELLE = 'PONCTUELLE', 'Ponctuelle'

    enseignant = models.ForeignKey(
        'core.Enseignant', on_delete=models.CASCADE, related_name='indisponibilites',
    )
    type    = models.CharField(max_length=12, choices=Type.choices)
    jour    = models.IntegerField(choices=Jour.choices)
    creneau = models.IntegerField(
        choices=Creneau.choices, null=True, blank=True,
        help_text="Vide = toute la journée.",
    )
    semaine = models.ForeignKey(
        'core.Semaine', null=True, blank=True, on_delete=models.CASCADE,
        related_name='indisponibilites',
        help_text="Renseignée pour une indisponibilité ponctuelle.",
    )
    motif    = models.CharField(max_length=200, blank=True)
    cree_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='indisponibilites_creees',
    )
    cree_le  = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = 'Indisponibilité enseignant'
        verbose_name_plural = 'Indisponibilités enseignants'
        ordering            = ['-cree_le']
        indexes             = [models.Index(fields=['enseignant', 'jour'])]

    def __str__(self):
        portee = 'récurrent' if self.type == self.Type.RECURRENTE else f'semaine {self.semaine_id}'
        creneau = self.get_creneau_display() if self.creneau is not None else 'journée'
        return f'{self.enseignant_id} indispo {self.get_jour_display()} {creneau} ({portee})'
