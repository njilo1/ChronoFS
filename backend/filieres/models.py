from django.db import models


class Departement(models.Model):

    nom  = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, unique=True)

    def __str__(self):
        return f"{self.code} — {self.nom}"

    class Meta:
        ordering = ['nom']
        verbose_name = 'Département'
        verbose_name_plural = 'Départements'


class Filiere(models.Model):
    """
    Une filière appartient à un département ET à un campus.
    Le campus détermine dans quelle ville étudient les étudiants de cette filière.
    Les étudiants d'une filière de Monatélé ne peuvent pas être programmés
    dans des salles d'Ebolowa et vice-versa (contrainte H5 de l'algorithme).
    """

    departement = models.ForeignKey(
        Departement,
        on_delete=models.CASCADE,
        related_name='filieres',
    )

    # Campus où est enseignée cette filière
    # null=True pour la compatibilité avec les données existantes
    campus = models.ForeignKey(
        'salles.Campus',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='filieres',
    )

    nom      = models.CharField(max_length=100)
    code     = models.CharField(max_length=10, unique=True)
    effectif = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.code} — {self.nom}"

    class Meta:
        ordering = ['nom']
        verbose_name = 'Filière'
        verbose_name_plural = 'Filières'


class Niveau(models.Model):

    NIVEAU_CHOICES = [
        ('L1', 'Licence 1'),
        ('L2', 'Licence 2'),
        ('L3', 'Licence 3'),
        ('M1', 'Master 1'),
        ('M2', 'Master 2'),
    ]

    filiere = models.ForeignKey(
        Filiere,
        on_delete=models.CASCADE,
        related_name='niveaux',
    )

    nom      = models.CharField(max_length=5, choices=NIVEAU_CHOICES)
    effectif = models.IntegerField(default=0)

    def __str__(self):
        campus_info = f" [{self.filiere.campus.code}]" if self.filiere.campus else ''
        return f"{self.filiere.code} {self.nom}{campus_info} ({self.effectif} étudiants)"

    class Meta:
        ordering = ['filiere', 'nom']
        verbose_name = 'Niveau'
        verbose_name_plural = 'Niveaux'
        unique_together = ['filiere', 'nom']
