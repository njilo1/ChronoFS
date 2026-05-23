from django.db import models

class Matiere(models.Model):

    TYPE_CHOICES = [
        ('CM', 'Cours Magistral'),
        ('TD', 'Travaux Dirigés'),
        ('TP', 'Travaux Pratiques'),
    ]

    # Code officiel de la matière ex: TIC224, ROSE315
    # Note: l'unicité n'est pas globale mais (code, niveau) — voir Meta.constraints.
    # Plusieurs filières peuvent partager le même code matière sans conflit.
    code = models.CharField(max_length=20)

    # Intitulé complet ex: "Analyse & Conception SI"
    intitule = models.CharField(max_length=200)

    # Type de séance
    type_seance = models.CharField(
        max_length=5,
        choices=TYPE_CHOICES,
        default='CM'
    )

    # La matière appartient à un niveau précis
    # ex: TIC224 est pour TIC L2
    niveau = models.ForeignKey(
        'filieres.Niveau',
        on_delete=models.CASCADE,
        related_name='matieres'
    )

    # L'enseignant qui donne ce cours
    # null=True = une matière peut exister sans enseignant assigné
    enseignant = models.ForeignKey(
        'enseignants.Enseignant',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='matieres'
    )

    # Volume horaire hebdomadaire en heures
    # ex: 2.5 = 2h30 par semaine
    volume_horaire = models.FloatField(default=2.5)

    # Session de planification à laquelle appartient cette matière.
    # Permet d'avoir des programmes différents semaine par semaine sans collision.
    # null=True pour les anciennes données (avant l'introduction des sessions).
    session = models.ForeignKey(
        'planification.SessionPlanification',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='matieres',
    )

    def __str__(self):
        return f"{self.code} — {self.intitule} ({self.niveau})"

    class Meta:
        ordering = ['code']
        verbose_name = 'Matière'
        verbose_name_plural = 'Matières'
        constraints = [
            # Une UE ne peut apparaître qu'une fois par (niveau, session).
            # Si la session est null (héritage), l'unicité reste sur (code, niveau).
            models.UniqueConstraint(
                fields=['code', 'niveau', 'session'],
                name='matiere_code_unique_par_niveau_session',
            ),
        ]