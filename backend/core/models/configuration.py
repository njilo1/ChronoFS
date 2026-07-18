"""
Configuration du solver pilotée par le super-administrateur (Couche 0).

La FS-UEB est une faculté jeune, en croissance et en changement constant. On
veut donc pouvoir faire évoluer les règles de génération d'emploi du temps
SANS redéploiement, tout en gardant le noyau de règles dures inviolable.

Trois modèles :
- `RegleSolver`     : métadonnées d'une contrainte du solver. Les 9 dures
                      historiques (H1–H9) y figurent, verrouillées et statiques
                      (toujours appliquées). Les règles DYNAMIQUES sont
                      composées par le super-admin à partir d'un catalogue de
                      *templates paramétrés* (cf. core/scheduling/registre.py).
- `FonctionObjectif`: métadonnées d'un terme de l'objectif lexicographique.
                      L'ordre (`priorite`) définit la cascade ; le poids réel
                      est DÉRIVÉ des bornes par le solver, jamais stocké.
- `JournalGeneration`: trace d'audit d'une génération (config appliquée +
                      résultat). Alimente le dashboard super-admin.

IMPORTANT : `parametres` ne contient JAMAIS de code exécutable — uniquement des
valeurs (nombres, codes) validées par le schéma du template. Aucun eval/exec.
"""

from django.conf import settings
from django.db import models

from core.constants import (
    CategorieRegle,
    SensObjectif,
    TypeRegle,
)


class RegleSolver(models.Model):
    """Une contrainte du solver, activable et (pour les dynamiques) paramétrable."""

    code = models.SlugField(
        max_length=60,
        unique=True,
        help_text="Identifiant stable relié à un handler du registre "
                  "(ex. 'H1'…'H9' pour les dures historiques, 'R_<slug>' pour "
                  "les règles dynamiques).",
    )
    nom         = models.CharField(max_length=120)
    description = models.TextField(
        blank=True,
        help_text="Explication lisible affichée au DAR dans la modale de génération.",
    )

    type_regle = models.CharField(
        max_length=10,
        choices=TypeRegle.choices,
        default=TypeRegle.DURE,
    )
    categorie = models.CharField(
        max_length=10,
        choices=CategorieRegle.choices,
        default=CategorieRegle.DYNAMIQUE,
    )

    # Verrouillée : ni supprimable, ni désactivable, structure non modifiable.
    # Toujours injectée au solver. Les 9 règles fondatrices sont verrouillées.
    verrouillee = models.BooleanField(default=False)

    # État initial de la case à cocher dans la modale de génération du DAR.
    active_par_defaut = models.BooleanField(default=True)

    # Nom du template du registre pour les règles DYNAMIQUES (schéma + builder
    # CP-SAT). NULL pour les 9 règles historiques codées en dur.
    template = models.SlugField(max_length=60, null=True, blank=True)

    # Paramètres de la règle dynamique, validés par le schéma du template
    # (ex. {"max": 1}). Jamais de code.
    parametres = models.JSONField(default=dict, blank=True)

    ordre      = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = 'Règle du solver'
        verbose_name_plural = 'Règles du solver'
        ordering            = ['ordre', 'code']

    def __str__(self):
        return f'{self.code} — {self.nom}'


class FonctionObjectif(models.Model):
    """Un terme de l'objectif lexicographique du solver."""

    code = models.SlugField(
        max_length=60,
        unique=True,
        help_text="Identifiant stable relié à un handler d'objectif du registre "
                  "(ex. 'OBJ_MAX_COURS', 'OBJ_VACATAIRES').",
    )
    nom         = models.CharField(max_length=120)
    description = models.TextField(blank=True)

    sens = models.CharField(
        max_length=3,
        choices=SensObjectif.choices,
        default=SensObjectif.MAX,
    )

    # Rang dans la cascade lexicographique : 1 = le plus prioritaire. Le poids
    # numérique w est DÉRIVÉ des bornes par le solver (garantit une hiérarchie
    # stricte), il n'est jamais saisi ni stocké ici.
    priorite = models.PositiveIntegerField(
        default=1,
        help_text="Rang lexicographique (1 = priorité maximale).",
    )

    verrouillee       = models.BooleanField(default=False)
    active_par_defaut = models.BooleanField(default=True)

    template   = models.SlugField(max_length=60, null=True, blank=True)
    parametres = models.JSONField(default=dict, blank=True)

    ordre      = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = 'Fonction objectif'
        verbose_name_plural = 'Fonctions objectif'
        ordering            = ['priorite', 'code']

    def __str__(self):
        return f'{self.code} — {self.nom} (P{self.priorite})'


class JournalGeneration(models.Model):
    """
    Trace d'audit d'une génération : quelle config a été appliquée et avec quel
    résultat. Permet au dashboard super-admin d'afficher le taux de réussite
    dans le temps et de reproduire une génération.
    """

    semaine = models.ForeignKey(
        'core.Semaine',
        on_delete=models.CASCADE,
        related_name='generations',
    )
    lancee_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='generations_lancees',
    )
    lancee_le = models.DateTimeField(auto_now_add=True)

    # Config réellement appliquée (listes de codes).
    regles_appliquees   = models.JSONField(default=list, blank=True)
    objectifs_appliques = models.JSONField(default=list, blank=True)

    nb_demandes     = models.PositiveIntegerField(default=0)
    nb_placees      = models.PositiveIntegerField(default=0)
    nb_non_placees  = models.PositiveIntegerField(default=0)
    taux            = models.FloatField(default=0.0)
    duree_ms        = models.PositiveIntegerField(default=0)
    statut_solver   = models.CharField(max_length=20, blank=True)

    class Meta:
        verbose_name        = 'Journal de génération'
        verbose_name_plural = 'Journaux de génération'
        ordering            = ['-lancee_le']

    def __str__(self):
        return f'Génération {self.semaine_id} — {self.taux:.0f}% ({self.lancee_le:%d/%m %H:%M})'
