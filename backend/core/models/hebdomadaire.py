"""
Données hebdomadaires FSChrono (Couches 2 et 3).

Couche 2 — données qui changent chaque semaine :
- Semaine                   : période planifiée (lundi → samedi)
- ImportPlanning            : envoi Excel actif d'un chef de département
- ImportPlanningHistorique  : versions précédentes (jamais supprimées)
- DemandeCours              : ligne du fichier Excel = demande de cours
- Seance                    : placement résolu par le solver, modifiable DAR

Couche 3 — archives à vie :
- ArchivePlanning           : PDF/Word exportés, conservés indéfiniment

Principe : on accumule, on n'écrase JAMAIS. Un nouveau dépôt déplace
l'ancien dans `ImportPlanningHistorique`. L'historique permet d'auditer
qui a envoyé quoi et quand.
"""

from django.conf import settings
from django.db import models

from core.constants import (
    Creneau,
    Jour,
    Semestre,
    StatutParsing,
    StatutSemaine,
    TypeCours,
)


# ── Calendrier ───────────────────────────────────────────────────────────────
class Semaine(models.Model):
    """Période de planification (du lundi au samedi de la semaine donnée)."""

    annee_academique = models.ForeignKey(
        'core.AnneeAcademique',
        on_delete=models.CASCADE,
        related_name='semaines',
    )
    date_debut       = models.DateField(help_text="Lundi de la semaine.")
    date_fin         = models.DateField(help_text="Samedi de la semaine.")
    semestre         = models.IntegerField(choices=Semestre.choices)
    statut           = models.CharField(
        max_length=25,
        choices=StatutSemaine.choices,
        default=StatutSemaine.DRAFT,
    )
    # Référence officielle UEB : "N° 26-00102/UEb/DFS/DAARS"
    numero_reference = models.CharField(max_length=50, blank=True)

    class Meta:
        verbose_name        = 'Semaine'
        verbose_name_plural = 'Semaines'
        ordering            = ['-date_debut']

    def __str__(self):
        return f'Semaine du {self.date_debut:%d/%m/%Y} au {self.date_fin:%d/%m/%Y}'


# ── Imports Excel ────────────────────────────────────────────────────────────
class ImportPlanning(models.Model):
    """
    Envoi Excel ACTIF d'un département pour une semaine.

    Une ligne par (semaine, departement). Si le chef réenvoie un fichier,
    l'ancien est déplacé dans `ImportPlanningHistorique` (version+1) AVANT
    d'écraser cette ligne.
    """

    semaine     = models.ForeignKey(Semaine,                         on_delete=models.CASCADE, related_name='imports')
    departement = models.ForeignKey('core.Departement',              on_delete=models.CASCADE, related_name='imports')
    fichier     = models.FileField(upload_to='imports/%Y/%m/')
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL,        on_delete=models.SET_NULL, null=True, related_name='imports_envoyes')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    statut_parsing  = models.CharField(
        max_length=20,
        choices=StatutParsing.choices,
        default=StatutParsing.EN_ATTENTE,
    )
    # JSON libre : {'lignes_ok': 42, 'lignes_erreur': 2, 'erreurs': [...]}
    rapport_parsing = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name        = 'Import de planning'
        verbose_name_plural = 'Imports de planning'
        unique_together     = ('semaine', 'departement')
        ordering            = ['-uploaded_at']

    def __str__(self):
        return f'Import {self.departement.code} — {self.semaine}'


class ImportPlanningHistorique(models.Model):
    """
    Versions archivées des imports remplacés. JAMAIS utilisées par le solver.

    Permet de répondre à la question : "qui a envoyé quoi et quand pour cette
    semaine, avant la version actuelle ?".
    """

    semaine     = models.ForeignKey(Semaine,                         on_delete=models.CASCADE, related_name='imports_historiques')
    departement = models.ForeignKey('core.Departement',              on_delete=models.CASCADE, related_name='imports_historiques')
    fichier     = models.FileField(upload_to='imports/archives/%Y/%m/')
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL,        on_delete=models.SET_NULL, null=True, related_name='+')

    # Date d'envoi initial de la version remplacée (recopiée depuis ImportPlanning).
    uploaded_at = models.DateTimeField()
    # Date à laquelle cette version a été remplacée par une plus récente.
    remplace_le = models.DateTimeField(auto_now_add=True)
    # Numéro incrémental (1 = premier, 2 = deuxième envoi remplacé, etc.).
    version     = models.IntegerField(default=1)

    class Meta:
        verbose_name        = "Import (archive)"
        verbose_name_plural = "Imports (archives)"
        ordering            = ['-remplace_le']

    def __str__(self):
        return f'v{self.version} — {self.departement.code} — {self.semaine}'


# ── Demandes de cours (lignes parsées du fichier Excel) ──────────────────────
class DemandeCours(models.Model):
    """
    Une ligne du fichier Excel d'un chef = une demande de cours.

    Le solver consomme ces demandes pour produire des `Seance` placées
    en salle. La demande contient l'effectif DÉCLARÉ par le chef (peut
    différer de l'effectif officiel de la Filière si présence partielle).
    """

    import_source    = models.ForeignKey(
        ImportPlanning,
        on_delete=models.CASCADE,
        related_name='demandes',
    )
    filiere          = models.ForeignKey('core.Filiere',    on_delete=models.CASCADE, related_name='demandes')
    ue               = models.ForeignKey('core.UE',         on_delete=models.CASCADE, related_name='demandes')
    enseignant       = models.ForeignKey(
        'core.Enseignant',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='demandes',
    )
    effectif_declare = models.IntegerField()

    jour       = models.IntegerField(choices=Jour.choices)
    creneau    = models.IntegerField(choices=Creneau.choices)
    type_cours = models.CharField(max_length=20, choices=TypeCours.choices, default=TypeCours.CM)

    observations = models.TextField(blank=True)

    class Meta:
        verbose_name        = 'Demande de cours'
        verbose_name_plural = 'Demandes de cours'
        ordering            = ['filiere', 'jour', 'creneau']

    def __str__(self):
        return f'{self.filiere} | {self.ue.code} | {self.get_jour_display()} {self.get_creneau_display()}'


# ── Séances planifiées (résultat du solver, éditables) ───────────────────────
class Seance(models.Model):
    """
    Séance planifiée pour une semaine donnée.

    Produite initialement par le solver à partir d'une `DemandeCours`. Le
    DAR peut la modifier manuellement (déplacement, changement de salle,
    changement d'enseignant). Toute modification est tracée.
    """

    semaine          = models.ForeignKey(Semaine,                  on_delete=models.CASCADE, related_name='seances')
    demande_origine  = models.ForeignKey(
        DemandeCours,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='seances',
    )
    filiere    = models.ForeignKey('core.Filiere',    on_delete=models.CASCADE, related_name='seances')
    ue         = models.ForeignKey('core.UE',         on_delete=models.CASCADE, related_name='seances')
    enseignant = models.ForeignKey(
        'core.Enseignant',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='seances',
    )
    salle = models.ForeignKey('core.Salle', on_delete=models.CASCADE, related_name='seances')

    jour       = models.IntegerField(choices=Jour.choices)
    creneau    = models.IntegerField(choices=Creneau.choices)
    type_cours = models.CharField(max_length=20, choices=TypeCours.choices)

    # Salle « partageable » : un TERRAIN accueille plusieurs filières SBAA au
    # même créneau. Ce drapeau (dérivé du type de salle) lève l'unicité
    # salle/créneau ci-dessous uniquement pour ces séances.
    salle_partageable = models.BooleanField(default=False)

    # Audit des modifications manuelles par le DAR
    modifie_manuellement = models.BooleanField(default=False)
    modifie_le           = models.DateTimeField(null=True, blank=True)
    modifie_par          = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='seances_modifiees',
    )

    class Meta:
        verbose_name        = 'Séance'
        verbose_name_plural = 'Séances'
        ordering            = ['semaine', 'jour', 'creneau']
        constraints = [
            # H1 — une salle ne peut accueillir qu'une seule séance par créneau,
            # SAUF les salles partageables (terrain) où plusieurs filières SBAA
            # cohabitent : la contrainte ne s'applique donc qu'à salle_partageable=False.
            models.UniqueConstraint(
                fields=['semaine', 'salle', 'jour', 'creneau'],
                condition=models.Q(salle_partageable=False),
                name='seance_salle_unique',
            ),
            # H3 — une classe ne peut suivre qu'un seul cours par créneau.
            models.UniqueConstraint(
                fields=['semaine', 'filiere', 'jour', 'creneau'],
                name='seance_filiere_unique',
            ),
        ]

    def save(self, *args, **kwargs):
        # Dérive le drapeau de partage depuis le type de salle (création
        # unitaire et modifications manuelles du DAR). NB : bulk_create ne
        # passe pas par save() → la génération le positionne explicitement.
        from core.constants import TypeSalle
        if self.salle_id:
            self.salle_partageable = (self.salle.type_salle == TypeSalle.TERRAIN)
        super().save(*args, **kwargs)

    def __str__(self):
        return (
            f'{self.ue.code} — {self.filiere} | '
            f'{self.get_jour_display()} {self.get_creneau_display()} | '
            f'Salle {self.salle.nom}'
        )


# ── Archives ─────────────────────────────────────────────────────────────────
class ArchivePlanning(models.Model):
    """
    PDF (et éventuellement Word) exportés pour une semaine.

    À chaque clic sur "Exporter", un nouvel enregistrement est créé avec
    version+1. Les fichiers sont conservés à vie pour pouvoir reproduire
    n'importe quel document officiel a posteriori.
    """

    semaine       = models.ForeignKey(Semaine, on_delete=models.CASCADE, related_name='archives')
    fichier_pdf   = models.FileField(upload_to='archives/pdf/%Y/%m/')
    fichier_docx  = models.FileField(upload_to='archives/docx/%Y/%m/', blank=True)
    exporte_le    = models.DateTimeField(auto_now_add=True)
    exporte_par   = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        on_delete=models.SET_NULL,
        related_name='exports',
    )
    version       = models.IntegerField(default=1)

    class Meta:
        verbose_name        = 'Archive de planning'
        verbose_name_plural = 'Archives de planning'
        ordering            = ['-exporte_le']

    def __str__(self):
        return f'Archive v{self.version} — {self.semaine}'
