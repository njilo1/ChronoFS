"""
Tests d'intégration du système de notifications (flux réel via l'API).

Scénario couvert :
- le DAR se connecte (JWT) et ouvre une semaine → tous les chefs sont notifiés ;
- un chef voit, compte et lit ses notifications ;
- le scopage est respecté (un chef ne voit jamais celles d'un autre, le DAR
  n'est pas spammé par l'événement « imports ouverts »).

S'exécute sur une base de test isolée (aucun impact sur la base de dev).
"""

from datetime import date

from rest_framework.test import APITestCase

from core.constants import Role, Semestre, StatutSemaine, TypeNotification
from core.models import AnneeAcademique, Departement, Notification, Semaine, User


class NotificationFlowTests(APITestCase):
    def setUp(self):
        self.annee = AnneeAcademique.objects.create(
            libelle='2025-2026', date_debut=date(2025, 10, 1),
            date_fin=date(2026, 7, 31), active=True,
        )
        self.semaine = Semaine.objects.create(
            annee_academique=self.annee,
            date_debut=date(2026, 6, 1), date_fin=date(2026, 6, 6),
            semestre=Semestre.S1, statut=StatutSemaine.DRAFT,
        )
        self.dept1 = Departement.objects.create(nom='Informatique', code='INF')
        self.dept2 = Departement.objects.create(nom='Mathématiques', code='MAT')

        self.dar = User.objects.create(username='dar_test', role=Role.DAR)
        self.dar.set_password('dar-pass-123'); self.dar.save()

        self.chef1 = User.objects.create(username='chef_inf', role=Role.CHEF_DEPT, departement=self.dept1)
        self.chef1.set_password('chef-pass-123'); self.chef1.save()

        self.chef2 = User.objects.create(username='chef_mat', role=Role.CHEF_DEPT, departement=self.dept2)
        self.chef2.set_password('chef-pass-123'); self.chef2.save()

    # ── Helpers ──────────────────────────────────────────────────────────────
    def _login(self, username, password):
        r = self.client.post('/api/auth/login/', {'username': username, 'password': password}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        return r.data['access']

    def _auth_as(self, username, password):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self._login(username, password)}')

    @staticmethod
    def _results(resp):
        return resp.data.get('results', resp.data) if isinstance(resp.data, dict) else resp.data

    # ── Tests ──────────────────────────────────────────────────────────────────
    def test_ouverture_semaine_notifie_tous_les_chefs(self):
        self._auth_as('dar_test', 'dar-pass-123')
        r = self.client.post(f'/api/semaines/{self.semaine.id}/ouvrir-imports/')
        self.assertEqual(r.status_code, 200, r.content)

        self.semaine.refresh_from_db()
        self.assertEqual(self.semaine.statut, StatutSemaine.IMPORTS_OUVERTS)

        for chef in (self.chef1, self.chef2):
            qs = Notification.objects.filter(destinataire=chef, type=TypeNotification.IMPORTS_OUVERTS)
            self.assertEqual(qs.count(), 1)
            self.assertEqual(qs.first().lien, '/chef/import')
            self.assertFalse(qs.first().lu)

        # Le DAR n'est pas destinataire de cet événement.
        self.assertEqual(Notification.objects.filter(destinataire=self.dar).count(), 0)

    def test_chef_compte_lit_et_tout_lire(self):
        # DAR ouvre la semaine.
        self._auth_as('dar_test', 'dar-pass-123')
        self.client.post(f'/api/semaines/{self.semaine.id}/ouvrir-imports/')

        # Le chef consulte ses notifications.
        self._auth_as('chef_inf', 'chef-pass-123')

        r = self.client.get('/api/notifications/compteur/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['non_lues'], 1)

        r = self.client.get('/api/notifications/')
        items = self._results(r)
        self.assertEqual(len(items), 1)
        notif_id = items[0]['id']

        # Lecture d'une notification → compteur retombe à 0.
        r = self.client.post(f'/api/notifications/{notif_id}/lire/')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['lu'])
        self.assertEqual(self.client.get('/api/notifications/compteur/').data['non_lues'], 0)

        # tout-lire reste idempotent (aucune non-lue restante).
        r = self.client.post('/api/notifications/tout-lire/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.client.get('/api/notifications/compteur/').data['non_lues'], 0)

    def test_scopage_par_destinataire(self):
        self._auth_as('dar_test', 'dar-pass-123')
        self.client.post(f'/api/semaines/{self.semaine.id}/ouvrir-imports/')

        # chef_mat ne voit que SA notification, jamais celle de chef_inf.
        self._auth_as('chef_mat', 'chef-pass-123')
        items = self._results(self.client.get('/api/notifications/'))
        self.assertEqual(len(items), 1)

        ids_chef2 = set(Notification.objects.filter(destinataire=self.chef2).values_list('id', flat=True))
        self.assertEqual({n['id'] for n in items}, ids_chef2)

    def test_chef_ne_peut_pas_ouvrir_une_semaine(self):
        self._auth_as('chef_inf', 'chef-pass-123')
        r = self.client.post(f'/api/semaines/{self.semaine.id}/ouvrir-imports/')
        self.assertIn(r.status_code, (403, 405))
        self.assertEqual(Notification.objects.count(), 0)
