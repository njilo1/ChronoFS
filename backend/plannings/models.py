from django.db import models


class EmploiDuTemps(models.Model):
    """
    Un EmploiDuTemps représente un planning pour une période donnée.
    Il peut être de type 'cours', 'examen' ou 'rattrapage'.
    Il est associé à un campus (Ebolowa ou Monatélé).
    """

    TYPE_PLANNING_CHOICES = [
        ('cours',      'Cours'),
        ('examen',     'Examen'),
        ('rattrapage', 'Rattrapage'),
    ]

    SEMESTRE_CHOICES = [('1', 'Semestre 1'), ('2', 'Semestre 2')]

    # Type de planning : cours hebdomadaire, session d'examen ou rattrapage
    type_planning = models.CharField(
        max_length=15,
        choices=TYPE_PLANNING_CHOICES,
        default='cours',
    )

    # Campus concerné par ce planning
    # null=True pour compatibilité avec les données existantes
    campus = models.ForeignKey(
        'salles.Campus',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='emplois_du_temps',
    )

    # Session de planification à laquelle appartient cet EDT.
    # Permet de retrouver l'historique : tous les EDT d'une semaine donnée.
    # null=True pour les anciens EDT créés avant l'introduction des sessions.
    session = models.ForeignKey(
        'planification.SessionPlanification',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='emplois_du_temps',
    )

    # Période couverte
    semaine_debut = models.DateField()
    semaine_fin   = models.DateField()

    semestre         = models.CharField(max_length=1, choices=SEMESTRE_CHOICES, default='1')
    annee_academique = models.CharField(max_length=9, default='2025-2026')
    est_publie       = models.BooleanField(default=False)
    cree_le          = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        campus_info = f" [{self.campus.code}]" if self.campus else ''
        return f"{self.get_type_planning_display()} — {self.semaine_debut}{campus_info} — {self.annee_academique}"

    class Meta:
        ordering = ['-semaine_debut', 'type_planning']
        verbose_name = 'Emploi du Temps'
        verbose_name_plural = 'Emplois du Temps'


class Creneau(models.Model):
    """
    Unité de base d'un planning de COURS.
    Ex: Lundi 7h30-10h00 / TIC L2 / Analyse SI / Dr Nyabeye / Salle N
    """

    JOUR_CHOICES = [
        ('lundi',    'Lundi'),
        ('mardi',    'Mardi'),
        ('mercredi', 'Mercredi'),
        ('jeudi',    'Jeudi'),
        ('vendredi', 'Vendredi'),
        ('samedi',   'Samedi'),
    ]

    # Plages horaires officielles pour les COURS (2h30)
    HEURE_DEBUT_CHOICES = [
        ('07:30', '7h30'),
        ('10:15', '10h15'),
        ('13:00', '13h00'),
        ('15:45', '15h45'),
    ]

    HEURE_FIN_CHOICES = [
        ('10:00', '10h00'),
        ('12:45', '12h45'),
        ('15:30', '15h30'),
        ('18:15', '18h15'),
    ]

    emploi_du_temps = models.ForeignKey(EmploiDuTemps, on_delete=models.CASCADE, related_name='creneaux')
    matiere         = models.ForeignKey('matieres.Matiere', on_delete=models.CASCADE, related_name='creneaux')
    salle           = models.ForeignKey('salles.Salle', on_delete=models.CASCADE, related_name='creneaux')

    jour        = models.CharField(max_length=10, choices=JOUR_CHOICES)
    heure_debut = models.CharField(max_length=5, choices=HEURE_DEBUT_CHOICES)
    heure_fin   = models.CharField(max_length=5, choices=HEURE_FIN_CHOICES)
    genere_auto = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.jour} {self.heure_debut}-{self.heure_fin} | {self.matiere.code} | Salle {self.salle.nom}"

    class Meta:
        ordering = ['jour', 'heure_debut']
        verbose_name = 'Créneau'
        verbose_name_plural = 'Créneaux'
        constraints = [
            models.UniqueConstraint(
                fields=['emploi_du_temps', 'salle', 'jour', 'heure_debut'],
                name='unique_salle_creneau',
            ),
            models.UniqueConstraint(
                fields=['emploi_du_temps', 'matiere', 'jour', 'heure_debut'],
                name='unique_enseignant_creneau',
            ),
        ]


class CreneauExamen(models.Model):
    """
    Unité de base d'un planning d'EXAMEN ou de RATTRAPAGE.

    Différences par rapport aux créneaux de cours :
    - Plages de 2h (pas 2h30) : 7h30-9h30 / 10h00-12h00 / 13h00-15h00 / 15h30-17h30
    - Jour précis (DateField, pas DayOfWeek) : ex. "Lundi 13 avril 2026"
    - Plusieurs examens simultanés dans différentes salles
    - Surveillants (liste d'enseignants) + Chef de salle
    - La matière peut être renseignée librement (code + intitulé) sans FK
    """

    # Plages horaires officielles pour les EXAMENS (2h)
    HEURE_DEBUT_CHOICES = [
        ('07:30', '7h30'),
        ('10:00', '10h00'),
        ('13:00', '13h00'),
        ('15:30', '15h30'),
    ]

    HEURE_FIN_CHOICES = [
        ('09:30', '9h30'),
        ('12:00', '12h00'),
        ('15:00', '15h00'),
        ('17:30', '17h30'),
    ]

    emploi_du_temps = models.ForeignKey(EmploiDuTemps, on_delete=models.CASCADE, related_name='creneaux_examen')

    # Jour spécifique de l'examen (date complète, pas juste le nom du jour)
    jour = models.DateField()

    heure_debut = models.CharField(max_length=5, choices=HEURE_DEBUT_CHOICES)
    heure_fin   = models.CharField(max_length=5, choices=HEURE_FIN_CHOICES)

    # Matière : code + intitulé saisis librement (plus flexible pour les examens)
    # La FK matiere est optionnelle (liaison avec la base des matières si elle existe)
    code_matiere = models.CharField(max_length=20)
    intitule     = models.CharField(max_length=200)
    matiere      = models.ForeignKey(
        'matieres.Matiere',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='creneaux_examen',
    )

    # Filière et niveau des étudiants qui passent cet examen
    filiere = models.ForeignKey(
        'filieres.Filiere',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='creneaux_examen',
    )
    niveau = models.ForeignKey(
        'filieres.Niveau',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='creneaux_examen',
    )

    # Salle où se déroule l'examen
    salle = models.ForeignKey(
        'salles.Salle',
        on_delete=models.CASCADE,
        related_name='creneaux_examen',
    )

    # Personnels de surveillance
    surveillants = models.ManyToManyField(
        'enseignants.Enseignant',
        related_name='surveillances',
        blank=True,
    )
    chef_salle = models.ForeignKey(
        'enseignants.Enseignant',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='chef_salles',
    )

    def __str__(self):
        return f"{self.jour} {self.heure_debut} | {self.code_matiere} | Salle {self.salle.nom}"

    class Meta:
        ordering = ['jour', 'heure_debut', 'salle__nom']
        verbose_name = 'Créneau Examen'
        verbose_name_plural = 'Créneaux Examen'
        constraints = [
            # Une salle ne peut pas accueillir deux examens au même moment
            models.UniqueConstraint(
                fields=['emploi_du_temps', 'salle', 'jour', 'heure_debut'],
                name='unique_salle_examen',
            ),
        ]
