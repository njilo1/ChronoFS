"""
Référentiel stable FSChrono (Couche 1).

Données rarement modifiées, gérées exclusivement par le DAR :
Campus, Salle, Departement, Filiere, Enseignant, UE, AnneeAcademique.

La règle métier capitale : une Filiere est rattachée à une VILLE
(EBOLOWA ou MONATELE) — pas à un Campus. Une classe physique
d'Ébolowa ne peut JAMAIS être programmée dans une salle de Monatélé,
et inversement. Une même filière pédagogique présente dans les deux
villes = deux enregistrements `Filiere` distincts.
"""

import re

from django.core.validators import RegexValidator
from django.db import models

from core.constants import (
    Grade,
    Niveau,
    Role,
    StatutEnseignant,
    TypeSalle,
    Ville,
)

# Matricule officiel : 7 chiffres suivis d'une lettre (ex. 0777888A).
MATRICULE_REGEX = r'^\d{7}[A-Za-z]$'
valider_matricule = RegexValidator(
    MATRICULE_REGEX,
    "Format de matricule invalide : 7 chiffres suivis d'une lettre (ex. 0777888A).",
)


# ── Géographie ───────────────────────────────────────────────────────────────
class Campus(models.Model):
    """Site physique (Campus Principal FS, Lycée Classique, Face CRA, etc.)."""

    nom   = models.CharField(max_length=100, unique=True)
    ville = models.CharField(max_length=20, choices=Ville.choices)

    class Meta:
        verbose_name        = 'Campus'
        verbose_name_plural = 'Campus'
        ordering            = ['ville', 'nom']

    def __str__(self):
        return f'{self.nom} ({self.get_ville_display()})'


class Salle(models.Model):
    """Salle d'enseignement rattachée à un Campus."""

    nom        = models.CharField(max_length=50)
    campus     = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name='salles')
    capacite   = models.IntegerField()
    type_salle = models.CharField(max_length=30, choices=TypeSalle.choices)
    disponible = models.BooleanField(default=True)

    class Meta:
        verbose_name        = 'Salle'
        verbose_name_plural = 'Salles'
        # Le nom de salle n'est unique qu'à l'intérieur d'un campus :
        # "Salle A" peut exister à Ébolowa ET à Monatélé.
        unique_together     = ('nom', 'campus')
        ordering            = ['campus', 'nom']

    def __str__(self):
        return f'{self.nom} — {self.campus.nom} ({self.capacite} places)'


# ── Organisation pédagogique ─────────────────────────────────────────────────
class Departement(models.Model):
    nom  = models.CharField(max_length=150)
    code = models.CharField(max_length=10, unique=True)

    class Meta:
        verbose_name        = 'Département'
        verbose_name_plural = 'Départements'
        ordering            = ['code']

    @property
    def chef(self):
        """Chef de département (premier compte CHEF_DEPT rattaché), ou None.

        Un département est caractérisé par son chef ; la relation vit côté
        `User.departement` (related_name='chefs').
        """
        return self.chefs.filter(role=Role.CHEF_DEPT).first()

    @property
    def chef_nom(self) -> str:
        """Nom affichable du chef (« Grade NOM »), ou '' si aucun chef."""
        c = self.chef
        if not c:
            return ''
        nom = (c.last_name or c.first_name or c.username).strip()
        return f'{c.get_grade_display()} {nom}'.strip() if c.grade else nom

    def __str__(self):
        return f'{self.code} — {self.nom}'


class Filiere(models.Model):
    """
    Classe pédagogique pour un niveau et une ville donnés.

    Exemple : "Production Animale L1 Ébolowa" et "Production Animale L1
    Monatélé" sont 2 enregistrements Filiere distincts, avec leurs propres
    effectifs et des UE potentiellement différentes.
    """

    nom         = models.CharField(max_length=100)
    code        = models.CharField(max_length=20)
    departement = models.ForeignKey(
        Departement,
        on_delete=models.CASCADE,
        related_name='filieres',
    )
    niveau   = models.CharField(max_length=10, choices=Niveau.choices)
    ville    = models.CharField(max_length=20, choices=Ville.choices)
    effectif = models.IntegerField(default=0)

    # Surcharge optionnelle : impose UN campus précis (parmi ceux de la ville
    # de la filière). Laisser vide = seule la contrainte de ville s'applique.
    # Cas d'usage : une filière dont l'effectif n'entre que dans l'amphi E du
    # Campus Principal, qu'on veut épingler à ce campus quoi qu'il arrive.
    campus_obligatoire = models.ForeignKey(
        Campus,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='filieres_forcees',
        help_text="Optionnel : force toutes les séances de cette filière dans ce campus.",
    )

    class Meta:
        verbose_name        = 'Filière'
        verbose_name_plural = 'Filières'
        # Une filière est unique pour un (code, niveau, ville) donné.
        # Permet d'autoriser TIC L1 dans 2 villes différentes.
        unique_together     = ('code', 'niveau', 'ville')
        ordering            = ['code', 'niveau', 'ville']

    def get_campus_contraint(self):
        """
        Campus imposé pour cette filière, ou None si seule la ville contraint.

        Utilisé par le solveur (H7bis) : quand un campus est renvoyé, toutes
        les séances de la filière doivent y être placées ; sinon n'importe
        quelle salle de la bonne ville convient.
        """
        return self.campus_obligatoire

    @property
    def libelle_classe(self) -> str:
        """
        Libellé d'affichage de la classe pour les exports (PDF/DOCX) et la
        consultation : le niveau est inclus, mais sans doublon.

        Le champ `nom` contient parfois déjà le niveau ("TIC L1",
        "M1 IA et BIG DATA") et parfois non ("Chimie Minéral"). On
        n'ajoute le niveau que s'il n'est pas déjà présent comme mot, pour
        éviter l'affichage fautif "TIC L1 L1" tout en conservant
        "Chimie Minéral L3".
        """
        nom = (self.nom or '').strip()
        if not self.niveau:
            return nom
        niveau_label = self.get_niveau_display()
        for marqueur in (self.niveau, niveau_label):
            if marqueur and re.search(rf'\b{re.escape(marqueur)}\b', nom, re.IGNORECASE):
                return nom
        return f'{nom} {self.niveau}'.strip()

    def __str__(self):
        return f'{self.code} {self.niveau} ({self.get_ville_display()})'


# ── Enseignants et UE ────────────────────────────────────────────────────────
class Enseignant(models.Model):
    """
    Enseignant rattaché à un ou plusieurs départements.

    Un enseignant qui couvre plusieurs départements (cas fréquent à la FS-UEB)
    est représenté par UN enregistrement unique avec une relation ManyToMany.
    """

    nom          = models.CharField(max_length=100)
    grade        = models.CharField(max_length=10, choices=Grade.choices)
    # Matricule officiel : uniquement pour les PERMANENTS (7 chiffres + 1 lettre).
    # Les vacataires n'en ont pas → champ NULL ; ils sont identifiés par une
    # référence interne générée (cf. propriété `identifiant`).
    matricule    = models.CharField(
        max_length=8,
        blank=True, null=True, unique=True,
        validators=[valider_matricule],
        help_text="Matricule officiel des permanents : 7 chiffres + 1 lettre (ex. 0777888A). "
                  "Laisser vide pour les vacataires.",
    )
    statut       = models.CharField(
        max_length=12,
        choices=StatutEnseignant.choices,
        default=StatutEnseignant.PERMANENT,
        help_text="Les vacataires sont prioritaires lors de la génération du planning.",
    )
    departements = models.ManyToManyField(
        Departement,
        related_name='enseignants',
        blank=True,
    )
    actif        = models.BooleanField(
        default=True,
        help_text="Décocher pour désactiver l'enseignant (indisponible, congé, départ). "
                  "Un enseignant inactif n'est plus proposé pour de nouvelles affectations.",
    )

    class Meta:
        verbose_name        = 'Enseignant'
        verbose_name_plural = 'Enseignants'
        # On évite les doublons exacts (même grade + même nom).
        unique_together     = ('nom', 'grade')
        ordering            = ['nom']

    @property
    def identifiant(self) -> str:
        """Identifiant unique lisible de l'enseignant.

        - Permanent : son matricule officiel (ex. 0777888A).
        - Vacataire (sans matricule) : référence interne générée à partir de
          l'id technique (ex. VAC-0007), toujours unique.
        - Permanent dont le matricule n'est pas encore saisi : référence
          interne « ENS-xxxx » (cas de données héritées à compléter).
        """
        if self.matricule:
            return self.matricule
        if not self.pk:
            return ''
        prefixe = 'VAC' if self.statut == StatutEnseignant.VACATAIRE else 'ENS'
        return f'{prefixe}-{self.pk:04d}'

    def save(self, *args, **kwargs):
        # Normalise la chaîne vide en NULL : sinon plusieurs '' violeraient
        # la contrainte d'unicité du matricule (un seul '' autorisé).
        if not self.matricule:
            self.matricule = None
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.get_grade_display()} {self.nom}'


class UE(models.Model):
    """Unité d'Enseignement (matière) rattachée à une filière précise."""

    # En Faculté des Sciences, une UE vaut soit 3, soit 6 crédits.
    CREDITS_CHOICES = [(3, '3 crédits'), (6, '6 crédits')]

    code     = models.CharField(max_length=20, unique=True)
    intitule = models.CharField(max_length=200)
    filiere  = models.ForeignKey(Filiere, on_delete=models.CASCADE, related_name='ues')
    credits  = models.PositiveSmallIntegerField(
        choices=CREDITS_CHOICES, default=6,
        help_text='Nombre de crédits de l’UE (3 ou 6 en FS).',
    )

    class Meta:
        verbose_name        = 'UE'
        verbose_name_plural = 'UE'
        ordering            = ['code']

    def __str__(self):
        return f'{self.code} — {self.intitule}'


# ── Calendrier académique ────────────────────────────────────────────────────
class AnneeAcademique(models.Model):
    """Année universitaire (ex. 2025-2026). Une seule peut être active."""

    libelle    = models.CharField(max_length=20, unique=True)
    date_debut = models.DateField()
    date_fin   = models.DateField()
    active     = models.BooleanField(default=False)

    class Meta:
        verbose_name        = 'Année académique'
        verbose_name_plural = 'Années académiques'
        ordering            = ['-date_debut']

    def __str__(self):
        return self.libelle
