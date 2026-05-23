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

from django.db import models

from core.constants import (
    Grade,
    Niveau,
    TypeSalle,
    Ville,
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

    class Meta:
        verbose_name        = 'Filière'
        verbose_name_plural = 'Filières'
        # Une filière est unique pour un (code, niveau, ville) donné.
        # Permet d'autoriser TIC L1 dans 2 villes différentes.
        unique_together     = ('code', 'niveau', 'ville')
        ordering            = ['code', 'niveau', 'ville']

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
    departements = models.ManyToManyField(
        Departement,
        related_name='enseignants',
        blank=True,
    )

    class Meta:
        verbose_name        = 'Enseignant'
        verbose_name_plural = 'Enseignants'
        # On évite les doublons exacts (même grade + même nom).
        unique_together     = ('nom', 'grade')
        ordering            = ['nom']

    def __str__(self):
        return f'{self.get_grade_display()} {self.nom}'


class UE(models.Model):
    """Unité d'Enseignement (matière) rattachée à une filière précise."""

    code     = models.CharField(max_length=20, unique=True)
    intitule = models.CharField(max_length=200)
    filiere  = models.ForeignKey(Filiere, on_delete=models.CASCADE, related_name='ues')

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
