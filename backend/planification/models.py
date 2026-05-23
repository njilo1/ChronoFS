from django.db import models


class SessionPlanification(models.Model):
    """
    Une session de planification = une semaine pour laquelle on construit
    un emploi du temps.

    Cycle de vie :
      collecte  → admin a créé la session, en attente des imports des chefs de dept
      pret      → tous les départements ont importé, prêt pour génération
      genere    → l'EDT a été généré, en attente de publication
      publie    → l'EDT est diffusé aux étudiants
      archive   → semaine terminée, garder pour historique
    """

    ETAT_CHOICES = [
        ('collecte', 'Collecte des programmes'),
        ('pret',     'Prêt à générer'),
        ('genere',   'Planning généré'),
        ('publie',   'Publié'),
        ('archive',  'Archivé'),
    ]

    SEMESTRE_CHOICES = [('1', 'Semestre 1'), ('2', 'Semestre 2')]

    libelle = models.CharField(
        max_length=120,
        help_text="Ex: 'Semaine du 18 au 23 mai 2026'",
    )

    semaine_debut    = models.DateField()
    semaine_fin      = models.DateField()
    semestre         = models.CharField(max_length=1, choices=SEMESTRE_CHOICES, default='1')
    annee_academique = models.CharField(max_length=9, default='2025-2026')

    etat = models.CharField(max_length=15, choices=ETAT_CHOICES, default='collecte')

    cree_le   = models.DateTimeField(auto_now_add=True)
    genere_le = models.DateTimeField(null=True, blank=True)
    publie_le = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.libelle} [{self.get_etat_display()}]"

    class Meta:
        ordering = ['-semaine_debut']
        verbose_name = 'Session de planification'
        verbose_name_plural = 'Sessions de planification'
        constraints = [
            models.UniqueConstraint(
                fields=['semaine_debut', 'semestre', 'annee_academique'],
                name='session_unique_par_semaine',
            ),
        ]


class ImportDepartement(models.Model):
    """
    Suivi de l'import du programme d'un département pour une session.

    Une ligne par (session, département) — créée vide à la création
    de la session. Le chef de département la "remplit" en envoyant son
    fichier Excel.
    """

    session = models.ForeignKey(
        SessionPlanification,
        on_delete=models.CASCADE,
        related_name='imports',
    )
    departement = models.ForeignKey(
        'filieres.Departement',
        on_delete=models.CASCADE,
        related_name='imports_planification',
    )

    date_import = models.DateTimeField(null=True, blank=True)
    fichier_nom = models.CharField(max_length=255, blank=True)
    nb_matieres = models.IntegerField(default=0)
    nb_erreurs  = models.IntegerField(default=0)

    @property
    def importe(self) -> bool:
        return self.date_import is not None

    def __str__(self):
        statut = '[OK]' if self.importe else '[--]'
        return f"{statut} {self.departement.code} — {self.session.libelle}"

    class Meta:
        ordering = ['session', 'departement__code']
        verbose_name = 'Import département'
        verbose_name_plural = 'Imports département'
        constraints = [
            models.UniqueConstraint(
                fields=['session', 'departement'],
                name='import_unique_par_session_dept',
            ),
        ]
