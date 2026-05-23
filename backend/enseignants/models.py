from django.db import models

class Enseignant(models.Model):

    # Le grade de l'enseignant
    GRADE_CHOICES = [
        ('Dr',  'Docteur'),
        ('Pr',  'Professeur'),
        ('Ing', 'Ingénieur'),
        ('M',   'Monsieur/Madame'),
    ]

    # Informations personnelles
    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100)
    grade = models.CharField(
        max_length=5,
        choices=GRADE_CHOICES,
        default='Dr'
    )

    # Email unique pour chaque enseignant
    # Servira aussi d'identifiant de connexion plus tard
    email = models.EmailField(unique=True)

    # Spécialité ex: "Informatique", "Mathématiques"
    specialite = models.CharField(max_length=100, blank=True)

    # Un enseignant peut enseigner dans plusieurs départements
    # C'est la réalité à l'UEB — contrainte importante !
    # ManyToMany = relation plusieurs à plusieurs
    # Ex: Dr. Kengni peut être dans TIC et ROSE
    departements = models.ManyToManyField(
        'filieres.Departement',
        related_name='enseignants',
        blank=True  # pas obligatoire à la création
    )

    # Est-ce que l'enseignant est actif ce semestre ?
    est_actif = models.BooleanField(default=True)

    # Retourner le nom complet avec grade
    def __str__(self):
        return f"{self.grade}. {self.nom} {self.prenom}"

    # Nom complet sans grade
    @property
    def nom_complet(self):
        return f"{self.nom} {self.prenom}"

    class Meta:
        ordering = ['nom', 'prenom']
        verbose_name = 'Enseignant'
        verbose_name_plural = 'Enseignants'