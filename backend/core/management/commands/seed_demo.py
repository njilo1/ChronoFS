"""
Commande Django : python manage.py seed_demo

Peuple la base de données avec un jeu de démonstration cohérent avec le
brief FSChrono v2 (§10) :

- 4 campus (3 à Ébolowa, 1 à Monatélé)
- 28 salles avec leurs types et capacités réels
- 3 départements (TIC, SBAA, PA) — seul TIC a un référentiel pédagogique complet
- 5 filières TIC + 12 UE + 9 enseignants
- 1 année académique 2025-2026 active
- 1 semaine de test (25/05/2026 → 30/05/2026) en statut IMPORTS_OUVERTS
- 4 utilisateurs : dar (DAR), chef_tic, chef_sbaa, chef_pa

100 % idempotent : on peut la rejouer sans dupliquer ni casser quoi que ce soit
(get_or_create partout). Pratique en dev pour réinitialiser après un flush.
"""

from datetime import date

from django.core.management.base import BaseCommand
from django.db import transaction

from core.constants import (
    Grade,
    Niveau,
    Role,
    Semestre,
    StatutSemaine,
    TypeSalle,
    Ville,
)
from core.models import (
    AnneeAcademique,
    Campus,
    Departement,
    Enseignant,
    Filiere,
    Salle,
    Semaine,
    UE,
    User,
)


class Command(BaseCommand):
    help = "Peuple la base de données avec un jeu de démonstration FSChrono."

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("🌱 Seed FSChrono v2 — démarrage\n"))

        campus_map     = self._seed_campus()
        self._seed_salles(campus_map)
        departements   = self._seed_departements()
        filieres_tic   = self._seed_filieres_tic(departements['TIC'])
        self._seed_ues_tic(filieres_tic)
        self._seed_enseignants(departements['TIC'])
        annee          = self._seed_annee_academique()
        self._seed_semaine_de_test(annee)
        self._seed_utilisateurs(departements)

        self.stdout.write(self.style.SUCCESS("\n✓ Seed terminé avec succès."))
        self._afficher_resume()

    # ── Campus ───────────────────────────────────────────────────────────────
    def _seed_campus(self) -> dict[str, Campus]:
        self.stdout.write("• Campus…")
        defs = [
            ('Campus Principal FS', Ville.EBOLOWA),
            ('Lycée Classique',     Ville.EBOLOWA),
            ('Face CRA',            Ville.EBOLOWA),
            ('Campus Monatélé',     Ville.MONATELE),
        ]
        return {
            nom: Campus.objects.get_or_create(nom=nom, defaults={'ville': ville})[0]
            for nom, ville in defs
        }

    # ── Salles ───────────────────────────────────────────────────────────────
    def _seed_salles(self, campus_map: dict[str, Campus]):
        self.stdout.write("• Salles…")

        # Structure : { nom_campus: [(nom_salle, capacite, type_salle), ...] }
        defs = {
            'Campus Principal FS': [
                ('E',                       220, TypeSalle.AMPHI),
                ('A',                       100, TypeSalle.COURS),
                ('B',                       100, TypeSalle.COURS),
                ('D',                        20, TypeSalle.COURS),
                ('Multimédia',               30, TypeSalle.MULTIMEDIA),
                ('Laboratoire',              25, TypeSalle.LABO),
                ('Sur le terrain Ébolowa',  500, TypeSalle.TERRAIN),
            ],
            'Lycée Classique': [
                (lettre, 20, TypeSalle.COURS)
                for lettre in ['F', 'G', 'H', 'I', 'J', 'K', 'L', 'O']
            ],
            'Face CRA': [
                ('M',             35, TypeSalle.COURS),
                ('N',             35, TypeSalle.COURS),
                ('Bureau 1 M',    15, TypeSalle.BUREAU),
                ('Bureau 2 M',    15, TypeSalle.BUREAU),
                ('Bureau 1 N',    15, TypeSalle.BUREAU),
                ('Bureau 2 N',    15, TypeSalle.BUREAU),
                ('Bureau 3 N',    15, TypeSalle.BUREAU),
            ],
            'Campus Monatélé': [
                ('A.M',                       40, TypeSalle.COURS),
                ('B.M',                       40, TypeSalle.COURS),
                ('C.M',                       40, TypeSalle.COURS),
                ('D.M',                       40, TypeSalle.COURS),
                ('Amphi 500',                500, TypeSalle.AMPHI),
                ('Sur le terrain Monatélé',  500, TypeSalle.TERRAIN),
            ],
        }

        total = 0
        for nom_campus, salles in defs.items():
            campus = campus_map[nom_campus]
            for nom, capacite, type_salle in salles:
                Salle.objects.get_or_create(
                    nom=nom,
                    campus=campus,
                    defaults={
                        'capacite':   capacite,
                        'type_salle': type_salle,
                        'disponible': True,
                    },
                )
                total += 1
        self.stdout.write(f"  → {total} salles présentes en base.")

    # ── Départements ─────────────────────────────────────────────────────────
    def _seed_departements(self) -> dict[str, Departement]:
        self.stdout.write("• Départements…")
        defs = [
            ('TIC',  "Technologies de l'Information et de la Communication"),
            ('SBAA', 'Sciences Biologiques et Agronomie Appliquée'),
            ('PA',   'Physique Appliquée'),
        ]
        return {
            code: Departement.objects.get_or_create(code=code, defaults={'nom': nom})[0]
            for code, nom in defs
        }

    # ── Filières TIC (toutes à Ébolowa) ──────────────────────────────────────
    def _seed_filieres_tic(self, dept_tic: Departement) -> dict[str, Filiere]:
        self.stdout.write("• Filières TIC (Ébolowa uniquement)…")
        defs = [
            # (code,    niveau,     nom,                       effectif)
            ('TIC',     Niveau.L1, 'TIC L1',                  80),
            ('TIC',     Niveau.L2, 'TIC L2',                  60),
            ('TIC',     Niveau.L3, 'TIC L3',                  45),
            ('IA-BD',   Niveau.M1, 'M1 IA et BIG DATA',       25),
            ('IA-BD',   Niveau.M2, 'M2 IA et BIG DATA',       15),
        ]
        filieres = {}
        for code, niveau, nom, effectif in defs:
            f, _ = Filiere.objects.get_or_create(
                code=code, niveau=niveau, ville=Ville.EBOLOWA,
                defaults={
                    'nom':         nom,
                    'departement': dept_tic,
                    'effectif':    effectif,
                },
            )
            # On indexe par "TIC L1", "TIC L2", "IA-BD M1", etc.
            filieres[f'{code} {niveau}'] = f
        return filieres

    # ── UE TIC (12) ──────────────────────────────────────────────────────────
    def _seed_ues_tic(self, filieres: dict[str, Filiere]):
        self.stdout.write("• UE TIC…")
        defs = [
            # (code,     intitulé,                                                clé_filiere)
            ('TIC122', 'Introduction aux réseaux',                                 'TIC L1'),
            ('TIC132', "Introduction aux systèmes d'exploitation",                 'TIC L1'),
            ('TIC224', 'Développement logiciel I',                                 'TIC L2'),
            ('TIC234', 'Architecture des logiciels',                               'TIC L2'),
            ('TIC254', 'Projet tuteuré',                                           'TIC L2'),
            ('TIC316', "Management des systèmes d'information",                    'TIC L3'),
            ('TIC336', 'Re-ingénierie des processus métiers',                      'TIC L3'),
            ('TIC346', "Développement d'applications mobiles",                     'TIC L3'),
            ('TIC458', "Projet d'intégration",                                     'IA-BD M1'),
            ('TIC529', 'IA pour les systèmes Edge et IoT',                         'IA-BD M2'),
            ('TIC539', 'Analyse avancée du Big Data et des graphes',               'IA-BD M2'),
            ('TIC559', 'IA fédérée et vie privée',                                 'IA-BD M2'),
        ]
        for code, intitule, cle_filiere in defs:
            UE.objects.get_or_create(
                code=code,
                defaults={
                    'intitule': intitule,
                    'filiere':  filieres[cle_filiere],
                },
            )

    # ── Enseignants TIC ──────────────────────────────────────────────────────
    def _seed_enseignants(self, dept_tic: Departement):
        self.stdout.write("• Enseignants TIC…")
        # ATTENTION : "M ASSOUMOU" et "Ing ASSOUMOU" sont deux personnes distinctes
        # (même nom de famille mais grades différents). La contrainte unique
        # (nom, grade) permet ce cas réel.
        defs = [
            ('DAOUDA',   Grade.M),
            ('HATMANN',  Grade.M),
            ('ASSOUMOU', Grade.M),
            ('ASSOUMOU', Grade.ING),
            ('ADAMOU',   Grade.DR),
            ('KENGNI',   Grade.DR),
            ('MESSI',    Grade.DR),
            ('FENDJI',   Grade.PR),
            ('BATOURE',  Grade.PR),
        ]
        for nom, grade in defs:
            ens, _ = Enseignant.objects.get_or_create(nom=nom, grade=grade)
            ens.departements.add(dept_tic)

    # ── Année académique ─────────────────────────────────────────────────────
    def _seed_annee_academique(self) -> AnneeAcademique:
        self.stdout.write("• Année académique 2025-2026…")
        annee, _ = AnneeAcademique.objects.get_or_create(
            libelle='2025-2026',
            defaults={
                'date_debut': date(2025, 10, 1),
                'date_fin':   date(2026, 7, 31),
                'active':     True,
            },
        )
        # Si déjà existante mais non active, on la réactive.
        if not annee.active:
            AnneeAcademique.objects.filter(active=True).update(active=False)
            annee.active = True
            annee.save(update_fields=['active'])
        return annee

    # ── Semaine de test ──────────────────────────────────────────────────────
    def _seed_semaine_de_test(self, annee: AnneeAcademique):
        self.stdout.write("• Semaine de test (25 → 30 mai 2026, imports ouverts)…")
        Semaine.objects.get_or_create(
            annee_academique=annee,
            date_debut=date(2026, 5, 25),
            defaults={
                'date_fin': date(2026, 5, 30),
                'semestre': Semestre.S1,
                'statut':   StatutSemaine.IMPORTS_OUVERTS,
            },
        )

    # ── Utilisateurs ─────────────────────────────────────────────────────────
    def _seed_utilisateurs(self, depts: dict[str, Departement]):
        self.stdout.write("• Utilisateurs…")

        # Le DAR — unique par contrainte BDD.
        dar, created = User.objects.get_or_create(
            username='dar',
            defaults={
                'role':       Role.DAR,
                'first_name': 'Division',
                'last_name':  'Affaires Académiques',
                'is_staff':   True,
                'is_superuser': True,
            },
        )
        if created:
            dar.set_password('dar123')
            dar.save()

        # Chefs de département.
        chefs = [
            ('chef_tic',  'tic123',  depts['TIC'],  'KENGNI',   Grade.DR),
            ('chef_sbaa', 'sbaa123', depts['SBAA'], 'ATANGANA', Grade.PR),
            ('chef_pa',   'pa123',   depts['PA'],   'NDJOMO',   Grade.DR),
        ]
        for username, password, dept, nom, grade in chefs:
            chef, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'role':        Role.CHEF_DEPT,
                    'departement': dept,
                    'grade':       grade,
                    'last_name':   nom,
                    'is_staff':    True,  # accès admin Django pour debug
                },
            )
            if created:
                chef.set_password(password)
                chef.save()

    # ── Résumé final ─────────────────────────────────────────────────────────
    def _afficher_resume(self):
        sep = '─' * 60
        self.stdout.write(f"\n{sep}\n📊 Contenu de la base après seed :\n{sep}")
        self.stdout.write(f"  Campus            : {Campus.objects.count()}")
        self.stdout.write(f"  Salles            : {Salle.objects.count()}")
        self.stdout.write(f"  Départements      : {Departement.objects.count()}")
        self.stdout.write(f"  Filières          : {Filiere.objects.count()}")
        self.stdout.write(f"  UE                : {UE.objects.count()}")
        self.stdout.write(f"  Enseignants       : {Enseignant.objects.count()}")
        self.stdout.write(f"  Années académiques: {AnneeAcademique.objects.count()}")
        self.stdout.write(f"  Semaines          : {Semaine.objects.count()}")
        self.stdout.write(f"  Utilisateurs      : {User.objects.count()}")
        self.stdout.write(f"\n🔑 Identifiants de test :")
        self.stdout.write("  dar       / dar123    (DAR — administrateur)")
        self.stdout.write("  chef_tic  / tic123    (Dr KENGNI — TIC)")
        self.stdout.write("  chef_sbaa / sbaa123   (Pr ATANGANA — SBAA)")
        self.stdout.write("  chef_pa   / pa123     (Dr NDJOMO — Physique Appliquée)")
