"""
Utilisateur custom FSChrono.

Deux rôles UNIQUEMENT :
- DAR       : administrateur ultime. Contrainte BDD : un seul compte DAR
              autorisé sur tout le système (UniqueConstraint partielle).
- CHEF_DEPT : chef de département. Rattaché à un Departement précis.

Les enseignants ne sont PAS des utilisateurs (modèle séparé `Enseignant`).
"""

from django.contrib.auth.models import AbstractUser
from django.db import models

from core.constants import Grade, Role


class User(AbstractUser):
    """Compte de connexion à FSChrono."""

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        help_text="Rôle fonctionnel (DAR ou CHEF_DEPT).",
    )

    # Chef de dept : obligatoire. DAR : doit rester null.
    departement = models.ForeignKey(
        'core.Departement',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='chefs',
        help_text="Département dont l'utilisateur est chef (CHEF_DEPT uniquement).",
    )

    grade = models.CharField(
        max_length=10,
        choices=Grade.choices,
        blank=True,
        help_text="Grade académique du chef (Dr, Pr, M, Mme, Ing).",
    )

    telephone = models.CharField(max_length=20, blank=True)

    class Meta:
        verbose_name        = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'
        constraints = [
            # Garantit qu'il n'existe qu'un seul compte DAR dans tout le système.
            # PostgreSQL crée un index partiel : aucune ligne ne peut être
            # ajoutée si une autre existe déjà avec role='DAR'.
            models.UniqueConstraint(
                fields=['role'],
                condition=models.Q(role=Role.DAR),
                name='unique_dar_account',
            ),
        ]

    def __str__(self):
        return f'{self.username} ({self.get_role_display()})'
