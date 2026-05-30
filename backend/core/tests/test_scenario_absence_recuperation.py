"""
Test end-to-end du SCÉNARIO RÉEL complet (Phases A→D), via l'API HTTP.

Mise en place : une seule salle, deux cours au même créneau (lundi 7h30).
À la génération, un seul tient → l'autre est sacrifié faute de salle.

Chaîne vérifiée :
1. POST /generer/        → 1 placé (le vacataire, priorité), 1 non placé.
2. Le chef signale l'absence du prof placé (lundi).
3. POST /seances-impactees/ → la séance du prof absent.
4. POST /annuler-seance/ → libère la salle à ce créneau.
5. GET /non-places/ → le cours sacrifié devient récupérable (créneau libéré).
6. POST /placer-cours/ → le cours sacrifié est enfin placé.

Base de test isolée : aucun impact sur la base de dev.
"""

from datetime import date

from rest_framework.test import APITestCase

from core.constants import (
    Creneau, Grade, Jour, Niveau, Role, Semestre, StatutEnseignant,
    StatutSemaine, TypeCours, TypeSalle, Ville,
)
from core.models import (
    AnneeAcademique, Campus, DemandeCours, Departement, Enseignant, Filiere,
    ImportPlanning, Salle, Seance, Semaine, UE, User,
)


class ScenarioAbsenceRecuperationTests(APITestCase):
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
        self.dept   = Departement.objects.create(nom='Informatique', code='INF')
        self.campus = Campus.objects.create(nom='Campus EB', ville=Ville.EBOLOWA)
        # UNE seule salle → force le conflit de placement.
        self.salle  = Salle.objects.create(nom='A', campus=self.campus, capacite=50, type_salle=TypeSalle.COURS)

        self.dar = User.objects.create(username='dar_test', role=Role.DAR)
        self.dar.set_password('p'); self.dar.save()
        self.chef = User.objects.create(username='chef_inf', role=Role.CHEF_DEPT, departement=self.dept)
        self.chef.set_password('p'); self.chef.save()

        self.f1 = Filiere.objects.create(code='INF', niveau=Niveau.L1, ville=Ville.EBOLOWA,
                                         nom='INF L1', departement=self.dept, effectif=30)
        self.f2 = Filiere.objects.create(code='INF', niveau=Niveau.L2, ville=Ville.EBOLOWA,
                                         nom='INF L2', departement=self.dept, effectif=30)
        self.u1 = UE.objects.create(code='INF101', intitule='Algo', filiere=self.f1)
        self.u2 = UE.objects.create(code='INF201', intitule='Réseaux', filiere=self.f2)

        # X = vacataire (sera PLACÉ, priorité solver) ; Y = permanent (sacrifié).
        self.ens_x = Enseignant.objects.create(nom='Vacataire X', grade=Grade.PR, statut=StatutEnseignant.VACATAIRE)
        self.ens_y = Enseignant.objects.create(nom='Permanent Y', grade=Grade.DR, statut=StatutEnseignant.PERMANENT)
        self.ens_x.departements.add(self.dept)
        self.ens_y.departements.add(self.dept)

        self.imp = ImportPlanning.objects.create(
            semaine=self.semaine, departement=self.dept, uploaded_by=self.dar, fichier='x.xlsx',
        )
        self.d_x = DemandeCours.objects.create(import_source=self.imp, filiere=self.f1, ue=self.u1,
            enseignant=self.ens_x, effectif_declare=30, jour=Jour.LUNDI, creneau=Creneau.C0, type_cours=TypeCours.CM)
        self.d_y = DemandeCours.objects.create(import_source=self.imp, filiere=self.f2, ue=self.u2,
            enseignant=self.ens_y, effectif_declare=30, jour=Jour.LUNDI, creneau=Creneau.C0, type_cours=TypeCours.CM)

    def _login(self, u):
        r = self.client.post('/api/auth/login/', {'username': u, 'password': 'p'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")

    def test_chaine_complete(self):
        # 1) Génération : le vacataire (X) est placé, le permanent (Y) sacrifié.
        self._login('dar_test')
        r = self.client.post(f'/api/semaines/{self.semaine.id}/generer/')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.data['placees'], 1)
        self.assertEqual(len(r.data['non_placees']), 1)
        self.assertEqual(r.data['non_placees'][0]['demande_id'], self.d_y.id)

        seance_x = Seance.objects.get(semaine=self.semaine, demande_origine=self.d_x)
        self.assertEqual(seance_x.jour, Jour.LUNDI)
        self.assertEqual(seance_x.creneau, Creneau.C0)

        # 2) Le chef signale l'absence de X le lundi.
        self._login('chef_inf')
        r = self.client.post('/api/mon-departement/indisponibilites/', {
            'enseignant': self.ens_x.id, 'type': 'PONCTUELLE',
            'semaine': self.semaine.id, 'jour': Jour.LUNDI,
        }, format='json')
        self.assertEqual(r.status_code, 201, r.content)

        # 3) Le DAR voit la séance impactée (celle de X).
        self._login('dar_test')
        r = self.client.get(f'/api/semaines/{self.semaine.id}/seances-impactees/')
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]['id'], seance_x.id)

        # 4) Le DAR annule la séance de X → libère la salle A lundi 7h30.
        r = self.client.post(f'/api/semaines/{self.semaine.id}/annuler-seance/',
                             {'seance_id': seance_x.id}, format='json')
        self.assertEqual(r.status_code, 200, r.content)

        # 5) Le cours Y devient récupérable, à son créneau d'origine (lundi C0).
        r = self.client.get(f'/api/semaines/{self.semaine.id}/non-places/')
        self.assertEqual(r.status_code, 200, r.content)
        cours = [c for c in r.data if c['demande_id'] == self.d_y.id]
        self.assertEqual(len(cours), 1)
        sugg = cours[0]['suggestions'][0]
        self.assertEqual(sugg['jour'], Jour.LUNDI)
        self.assertEqual(sugg['creneau'], Creneau.C0)
        self.assertEqual(sugg['salle_id'], self.salle.id)

        # 6) Le DAR applique → Y est enfin placé.
        r = self.client.post(f'/api/semaines/{self.semaine.id}/placer-cours/', {
            'demande_id': self.d_y.id, 'jour': sugg['jour'],
            'creneau': sugg['creneau'], 'salle_id': sugg['salle_id'],
        }, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertTrue(Seance.objects.filter(semaine=self.semaine, demande_origine=self.d_y).exists())

        # État final : 1 séance (Y) sur la semaine, celle de X ayant été annulée.
        self.assertEqual(Seance.objects.filter(semaine=self.semaine).count(), 1)
