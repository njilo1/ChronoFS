from django.db import models


class Campus(models.Model):
    """
    Un campus est un site physique de la Faculté des Sciences.
    Il peut être dans la ville d'Ebolowa ou dans une autre ville (ex: Monatélé).
    Les salles et les filières sont rattachées à un campus.
    """

    nom  = models.CharField(max_length=100)
    code = models.CharField(max_length=10, unique=True)

    # Ville où se trouve ce campus
    # 'Ebolowa' pour les campus d'Ebolowa, 'Monatélé' pour celui de Monatélé
    ville = models.CharField(max_length=100)

    # Adresse ou description du lieu (facultatif)
    adresse = models.CharField(max_length=200, blank=True)

    # Le campus principal de la Faculté (Campus FS Ebolowa)
    est_principal = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.code} — {self.nom} ({self.ville})"

    class Meta:
        ordering = ['-est_principal', 'ville', 'nom']
        verbose_name = 'Campus'
        verbose_name_plural = 'Campus'


class Salle(models.Model):
    """
    Une salle d'enseignement appartient à un campus.
    Le campus détermine dans quelle ville/site la salle se trouve.
    """

    # Le nom de la salle : A, B, E, M, N... ou "Sur le terrain"
    nom = models.CharField(max_length=20, unique=True)

    # La capacité maximale en nombre d'étudiants
    capacite = models.IntegerField()

    # Campus auquel appartient cette salle
    # null=True pour ne pas casser les données existantes pendant la migration
    campus = models.ForeignKey(
        Campus,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='salles',
    )

    # Est-ce que la salle est disponible ou en travaux ?
    est_disponible = models.BooleanField(default=True)

    def __str__(self):
        campus_info = f" — {self.campus.code}" if self.campus else ''
        return f"Salle {self.nom} ({self.capacite} places){campus_info}"

    class Meta:
        ordering = ['nom']
        verbose_name = 'Salle'
        verbose_name_plural = 'Salles'
