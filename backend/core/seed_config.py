"""
Données fondatrices de la configuration du solver (règles + objectifs).

Sert de source unique à la fois pour :
- la data-migration `0011_seed_configuration` (via `apps.get_model`) ;
- la commande `seed_superadmin` (via les vrais modèles).

Le helper `seeder_configuration` est idempotent (`get_or_create` par `code`) :
il crée les entrées manquantes sans écraser d'éventuelles personnalisations.

⚠️ Ne contient QUE des données (aucun modèle importé) pour rester utilisable
depuis une migration.
"""

# Les 9 contraintes dures historiques (H1–H9) : statiques, verrouillées,
# toujours appliquées. Codées en dur dans le solver (template=None).
REGLES_FONDATRICES = [
    ('H1', 'Une seule salle par cours',
     "Un cours ne peut être placé que dans une seule salle."),
    ('H2', 'Une salle, un cours par créneau',
     "Une salle n'accueille qu'un seul cours par créneau (hors terrain partagé SBAA)."),
    ('H3', 'Un enseignant, un cours par créneau',
     "Un enseignant ne peut donner qu'un seul cours par créneau."),
    ('H4', 'Une classe, un cours par créneau',
     "Une filière (classe) ne peut suivre qu'un seul cours par créneau."),
    ('H5', 'Capacité de salle suffisante',
     "La salle doit pouvoir accueillir l'effectif (forçage toléré jusqu'à +40 %)."),
    ('H6', 'Type de salle compatible',
     "Le type de salle doit être compatible avec le type de cours (CM/TD/TP…)."),
    ('H7', 'Salle dans la ville de la classe',
     "Une classe est planifiée dans une salle de sa propre ville (et campus imposé éventuel)."),
    ('H8', 'Une ville par enseignant et par jour',
     "Un enseignant n'enseigne que dans une seule ville par jour (pas d'aller-retour)."),
    ('H9', 'Un campus par classe et par semaine',
     "Une classe reste dans un seul campus pour toute la semaine."),
]

# Les 5 fonctions objectif de la cascade lexicographique (priorité 1 = max).
OBJECTIFS_FONDATEURS = [
    ('OBJ_MAX_COURS', 'Maximiser les cours placés',
     "Placer le maximum de cours de la semaine.",
     'MAX', 1, None, {}),
    ('OBJ_VACATAIRES', 'Priorité aux vacataires',
     "Les enseignants vacataires (non permanents) sont prioritaires.",
     'MAX', 2, 'PRIORITE_STATUT', {'statut': 'VACATAIRE'}),
    ('OBJ_EQUITE', 'Équité entre filières',
     "À nombre de cours égal, favoriser les filières les moins programmées.",
     'MAX', 3, None, {}),
    ('OBJ_CONTINUITE', 'Continuité de salle',
     "Garder une classe dans la même salle d'un créneau/jour à l'autre.",
     'MIN', 4, None, {}),
    ('OBJ_CAPACITE', 'Ajustement capacité/effectif',
     "Minimiser le gaspillage de places et le forçage de sur-effectif.",
     'MIN', 5, None, {}),
]


def seeder_configuration(RegleSolver, FonctionObjectif):
    """Crée (idempotemment) les règles et objectifs fondateurs."""
    for i, (code, nom, description) in enumerate(REGLES_FONDATRICES, start=1):
        RegleSolver.objects.get_or_create(
            code=code,
            defaults={
                'nom': nom,
                'description': description,
                'type_regle': 'DURE',
                'categorie': 'STATIQUE',
                'verrouillee': True,
                'active_par_defaut': True,
                'template': None,
                'parametres': {},
                'ordre': i,
            },
        )

    for i, (code, nom, description, sens, priorite, template, params) in enumerate(
        OBJECTIFS_FONDATEURS, start=1
    ):
        FonctionObjectif.objects.get_or_create(
            code=code,
            defaults={
                'nom': nom,
                'description': description,
                'sens': sens,
                'priorite': priorite,
                'verrouillee': True,
                'active_par_defaut': True,
                'template': template,
                'parametres': params,
                'ordre': i,
            },
        )
