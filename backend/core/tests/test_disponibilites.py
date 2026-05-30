"""
Tests de la disponibilité des enseignants (Phase A).

1. `creneaux_bloques` développe correctement les indisponibilités
   (créneau précis vs journée entière, récurrente vs ponctuelle).
2. Contrainte DURE au solver : un cours sur un créneau indisponible n'est pas
   placé, avec une raison lisible.
"""

from datetime import date

from django.test import TestCase
from rest_framework.test import APITestCase

from core.constants import (
    Creneau, Grade, Jour, Niveau, Role, Semestre, StatutSemaine, TypeCours, TypeSalle, Ville,
)
from core.models import (
    AnneeAcademique, Campus, DemandeCours, Departement, Enseignant, Filiere,
    IndisponibiliteEnseignant, ImportPlanning, Salle, Semaine, UE, User,
)
from core.scheduling.solver import PlanningSolver
from core.services.disponibilites import creneaux_bloques


class _Base(TestCase):
    def setUp(self):
        self.annee = AnneeAcademique.objects.create(
            libelle='2025-2026', date_debut=date(2025, 10, 1),
            date_fin=date(2026, 7, 31), active=True,
        )
        self.semaine = Semaine.objects.create(
            annee_academique=self.annee, date_debut=date(2026, 6, 8),
            date_fin=date(2026, 6, 13), semestre=Semestre.S1,
            statut=StatutSemaine.IMPORTS_CLOTURES,
        )
        self.campus = Campus.objects.create(nom='Campus EB', ville=Ville.EBOLOWA)
        self.salle = Salle.objects.create(
            nom='A', campus=self.campus, capacite=50, type_salle=TypeSalle.COURS,
        )
        self.dept = Departement.objects.create(nom='Informatique', code='INF')
        self.fil = Filiere.objects.create(
            code='INF', niveau=Niveau.L1, ville=Ville.EBOLOWA,
            nom='INF L1', departement=self.dept, effectif=30,
        )
        self.ue = UE.objects.create(code='INF101', intitule='Algo', filiere=self.fil)
        self.ens = Enseignant.objects.create(nom='Mbarga Jean', grade=Grade.DR)
        self.ens.departements.add(self.dept)
        self.dar = User.objects.create(username='dar_test')
        self.imp = ImportPlanning.objects.create(
            semaine=self.semaine, departement=self.dept, uploaded_by=self.dar, fichier='x.xlsx',
        )


class CreneauxBloquesTests(_Base):
    def test_creneau_precis(self):
        IndisponibiliteEnseignant.objects.create(
            enseignant=self.ens, type=IndisponibiliteEnseignant.Type.PONCTUELLE,
            jour=Jour.LUNDI, creneau=Creneau.C0, semaine=self.semaine,
        )
        bloque = creneaux_bloques(self.semaine)
        self.assertIn((self.ens.id, Jour.LUNDI, Creneau.C0), bloque)
        self.assertNotIn((self.ens.id, Jour.LUNDI, Creneau.C1), bloque)

    def test_journee_entiere_developpe_les_4_creneaux(self):
        IndisponibiliteEnseignant.objects.create(
            enseignant=self.ens, type=IndisponibiliteEnseignant.Type.PONCTUELLE,
            jour=Jour.LUNDI, creneau=None, semaine=self.semaine,
        )
        bloque = creneaux_bloques(self.semaine)
        for c in (Creneau.C0, Creneau.C1, Creneau.C2, Creneau.C3):
            self.assertIn((self.ens.id, Jour.LUNDI, c), bloque)

    def test_ponctuelle_autre_semaine_ignoree(self):
        autre = Semaine.objects.create(
            annee_academique=self.annee, date_debut=date(2026, 6, 15),
            date_fin=date(2026, 6, 20), semestre=Semestre.S1, statut=StatutSemaine.DRAFT,
        )
        IndisponibiliteEnseignant.objects.create(
            enseignant=self.ens, type=IndisponibiliteEnseignant.Type.PONCTUELLE,
            jour=Jour.LUNDI, creneau=Creneau.C0, semaine=autre,
        )
        self.assertEqual(creneaux_bloques(self.semaine), set())


class SolverIndispoTests(_Base):
    def test_cours_sur_creneau_indispo_non_place(self):
        # Sans indispo, ce cours serait trivialement plaçable (1 salle libre).
        d = DemandeCours.objects.create(
            import_source=self.imp, filiere=self.fil, ue=self.ue, enseignant=self.ens,
            effectif_declare=30, jour=Jour.LUNDI, creneau=Creneau.C0, type_cours=TypeCours.CM,
        )
        IndisponibiliteEnseignant.objects.create(
            enseignant=self.ens, type=IndisponibiliteEnseignant.Type.PONCTUELLE,
            jour=Jour.LUNDI, creneau=Creneau.C0, semaine=self.semaine,
        )
        bloque = creneaux_bloques(self.semaine)
        res = PlanningSolver([d], [self.salle], indispos=bloque).solve(time_limit_sec=5)

        self.assertEqual(len(res.placements), 0)
        self.assertEqual(len(res.non_places), 1)
        self.assertTrue(any('indisponible' in r.lower() for r in res.non_places[0].raisons))


class IndispoApiTests(APITestCase):
    def setUp(self):
        self.annee = AnneeAcademique.objects.create(
            libelle='2025-2026', date_debut=date(2025, 10, 1),
            date_fin=date(2026, 7, 31), active=True,
        )
        self.semaine = Semaine.objects.create(
            annee_academique=self.annee, date_debut=date(2026, 6, 8),
            date_fin=date(2026, 6, 13), semestre=Semestre.S1,
            statut=StatutSemaine.IMPORTS_OUVERTS,
        )
        self.dept       = Departement.objects.create(nom='Informatique', code='INF')
        self.autre_dept = Departement.objects.create(nom='Maths', code='MAT')
        self.chef = User.objects.create(username='chef_inf', role=Role.CHEF_DEPT, departement=self.dept)
        self.chef.set_password('p'); self.chef.save()
        self.ens = Enseignant.objects.create(nom='Mbarga Jean', grade=Grade.DR)
        self.ens.departements.add(self.dept)
        self.ens_autre = Enseignant.objects.create(nom='Tagne Paul', grade=Grade.PR)
        self.ens_autre.departements.add(self.autre_dept)

    def _auth(self):
        r = self.client.post('/api/auth/login/', {'username': 'chef_inf', 'password': 'p'}, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")

    def test_chef_cree_et_liste_absence(self):
        self._auth()
        r = self.client.post('/api/mon-departement/indisponibilites/', {
            'enseignant': self.ens.id, 'type': 'PONCTUELLE', 'semaine': self.semaine.id,
            'jour': Jour.JEUDI, 'creneau': None, 'motif': 'mission',
        }, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        r = self.client.get(f'/api/mon-departement/indisponibilites/?enseignant={self.ens.id}')
        items = r.data.get('results', r.data) if isinstance(r.data, dict) else r.data
        self.assertEqual(len(items), 1)

    def test_chef_ne_peut_pas_cibler_enseignant_autre_dept(self):
        self._auth()
        r = self.client.post('/api/mon-departement/indisponibilites/', {
            'enseignant': self.ens_autre.id, 'type': 'PONCTUELLE',
            'semaine': self.semaine.id, 'jour': Jour.JEUDI,
        }, format='json')
        self.assertEqual(r.status_code, 400, r.content)
