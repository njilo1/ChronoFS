"""
Test end-to-end du workflow d'absence après génération (Phase C).

Scénario : planning DÉJÀ généré, un enseignant a une séance lundi 7h30.
1. Le chef signale l'absence (lundi) → le DAR est notifié (ABSENCE_SIGNALEE).
2. GET /seances-impactees/ liste la séance touchée.
3. POST /annuler-seance/ la supprime ; la liste se vide.

Base de test isolée — aucun impact sur la base de dev.
"""

from datetime import date

from rest_framework.test import APITestCase

from core.constants import (
    Creneau, Grade, Jour, Niveau, Role, Semestre, StatutSemaine, TypeCours, TypeSalle, Ville,
)
from core.constants import TypeNotification
from core.models import (
    AnneeAcademique, Campus, Departement, Enseignant, Filiere,
    Notification, Salle, Seance, Semaine, UE, User,
)


class AbsenceWorkflowTests(APITestCase):
    def setUp(self):
        self.annee = AnneeAcademique.objects.create(
            libelle='2025-2026', date_debut=date(2025, 10, 1),
            date_fin=date(2026, 7, 31), active=True,
        )
        self.semaine = Semaine.objects.create(
            annee_academique=self.annee, date_debut=date(2026, 6, 8),
            date_fin=date(2026, 6, 13), semestre=Semestre.S1,
            statut=StatutSemaine.GENERE,
        )
        self.dept = Departement.objects.create(nom='Informatique', code='INF')
        self.campus = Campus.objects.create(nom='Campus EB', ville=Ville.EBOLOWA)
        self.salle = Salle.objects.create(nom='A', campus=self.campus, capacite=50, type_salle=TypeSalle.COURS)
        self.fil = Filiere.objects.create(code='INF', niveau=Niveau.L1, ville=Ville.EBOLOWA,
                                          nom='INF L1', departement=self.dept, effectif=30)
        self.ue = UE.objects.create(code='INF101', intitule='Algo', filiere=self.fil)
        self.ens = Enseignant.objects.create(nom='Mbarga Jean', grade=Grade.DR)
        self.ens.departements.add(self.dept)

        self.dar = User.objects.create(username='dar_test', role=Role.DAR)
        self.dar.set_password('p'); self.dar.save()
        self.chef = User.objects.create(username='chef_inf', role=Role.CHEF_DEPT, departement=self.dept)
        self.chef.set_password('p'); self.chef.save()

        # Séance existante (planning généré) : Mbarga, lundi 7h30, salle A.
        self.seance = Seance.objects.create(
            semaine=self.semaine, filiere=self.fil, ue=self.ue, enseignant=self.ens,
            salle=self.salle, jour=Jour.LUNDI, creneau=Creneau.C0, type_cours=TypeCours.CM,
        )

    def _auth(self, u):
        r = self.client.post('/api/auth/login/', {'username': u, 'password': 'p'}, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")

    def test_workflow_complet(self):
        # 1) Le chef signale l'absence (lundi, journée entière).
        self._auth('chef_inf')
        r = self.client.post('/api/mon-departement/indisponibilites/', {
            'enseignant': self.ens.id, 'type': 'PONCTUELLE',
            'semaine': self.semaine.id, 'jour': Jour.LUNDI,
        }, format='json')
        self.assertEqual(r.status_code, 201, r.content)

        # Le DAR a été notifié.
        self.assertTrue(
            Notification.objects.filter(
                destinataire=self.dar, type=TypeNotification.ABSENCE_SIGNALEE,
            ).exists()
        )

        # 2) Le DAR voit la séance impactée.
        self._auth('dar_test')
        r = self.client.get(f'/api/semaines/{self.semaine.id}/seances-impactees/')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]['id'], self.seance.id)

        # 3) Le DAR annule la séance.
        r = self.client.post(f'/api/semaines/{self.semaine.id}/annuler-seance/',
                             {'seance_id': self.seance.id}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertFalse(Seance.objects.filter(id=self.seance.id).exists())

        # Plus aucune séance impactée.
        r = self.client.get(f'/api/semaines/{self.semaine.id}/seances-impactees/')
        self.assertEqual(len(r.data), 0)

    def test_pas_de_notif_si_aucune_seance_impactee(self):
        # Absence un autre jour (mardi) où l'enseignant n'a pas cours.
        self._auth('chef_inf')
        self.client.post('/api/mon-departement/indisponibilites/', {
            'enseignant': self.ens.id, 'type': 'PONCTUELLE',
            'semaine': self.semaine.id, 'jour': Jour.MARDI,
        }, format='json')
        self.assertFalse(
            Notification.objects.filter(
                destinataire=self.dar, type=TypeNotification.ABSENCE_SIGNALEE,
            ).exists()
        )
