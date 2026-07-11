"""
Tests d'API du profil super-administrateur.

Couvre : permissions (DAR/chef vs super-admin), verrouillage des règles/objectifs
fondateurs, gestion des comptes DAR/chef, création de règle dynamique, et
réordonnancement des objectifs.

La config fondatrice (9 règles + 5 objectifs) est seedée par les migrations,
donc présente dans la base de test.
"""

from rest_framework import status
from rest_framework.test import APITestCase

from core.constants import Role
from core.models import Departement, FonctionObjectif, RegleSolver, User


class SuperAdminApiTests(APITestCase):

    @classmethod
    def setUpTestData(cls):
        cls.superadmin = User.objects.create(username='super', role=Role.SUPERADMIN, is_staff=True)
        cls.dept = Departement.objects.create(nom='Informatique', code='TIC')
        cls.chef = User.objects.create(username='chef', role=Role.CHEF_DEPT, departement=cls.dept)

    # ── Permissions ──────────────────────────────────────────────────────────
    def test_chef_interdit_sur_comptes(self):
        self.client.force_authenticate(self.chef)
        self.assertEqual(self.client.get('/api/comptes/').status_code, status.HTTP_403_FORBIDDEN)

    def test_superadmin_liste_comptes(self):
        self.client.force_authenticate(self.superadmin)
        r = self.client.get('/api/comptes/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_dar_peut_lire_regles_mais_pas_ecrire(self):
        dar = User.objects.create(username='dar', role=Role.DAR)
        self.client.force_authenticate(dar)
        self.assertEqual(self.client.get('/api/regles-solver/').status_code, status.HTTP_200_OK)
        # Écriture interdite au DAR.
        r = self.client.post('/api/regles-solver/', {
            'nom': 'X', 'template': 'MAX_COURS_JOUR_FILIERE', 'parametres': {'max': 2},
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_chef_ne_lit_pas_les_regles(self):
        self.client.force_authenticate(self.chef)
        self.assertEqual(self.client.get('/api/regles-solver/').status_code, status.HTTP_403_FORBIDDEN)

    # ── Verrouillage des fondatrices ─────────────────────────────────────────
    def test_regle_verrouillee_non_supprimable(self):
        self.client.force_authenticate(self.superadmin)
        h1 = RegleSolver.objects.get(code='H1')
        r = self.client.delete(f'/api/regles-solver/{h1.id}/')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(RegleSolver.objects.filter(code='H1').exists())

    def test_regle_verrouillee_structure_figee(self):
        """On peut changer active_par_defaut d'une verrouillée, pas son type."""
        self.client.force_authenticate(self.superadmin)
        h1 = RegleSolver.objects.get(code='H1')
        r = self.client.patch(f'/api/regles-solver/{h1.id}/', {
            'active_par_defaut': False, 'type_regle': 'SOUPLE',
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        h1.refresh_from_db()
        self.assertFalse(h1.active_par_defaut)     # modif autorisée appliquée
        self.assertEqual(h1.type_regle, 'DURE')    # modif structurelle ignorée

    def test_objectif_verrouille_non_supprimable(self):
        self.client.force_authenticate(self.superadmin)
        obj = FonctionObjectif.objects.get(code='OBJ_MAX_COURS')
        r = self.client.delete(f'/api/fonctions-objectif/{obj.id}/')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    # ── Gestion des comptes ──────────────────────────────────────────────────
    def test_creation_chef_renvoie_mot_de_passe(self):
        self.client.force_authenticate(self.superadmin)
        dept2 = Departement.objects.create(nom='Physique', code='PHY')
        r = self.client.post('/api/comptes/', {
            'username': 'chef_phy', 'role': Role.CHEF_DEPT,
            'last_name': 'NKOLO', 'grade': 'DR', 'departement': dept2.id,
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertIn('mot_de_passe_genere', r.data)
        self.assertTrue(User.objects.filter(username='chef_phy', role=Role.CHEF_DEPT).exists())

    def test_creation_dar_refusee_si_existant(self):
        User.objects.create(username='dar', role=Role.DAR)
        self.client.force_authenticate(self.superadmin)
        r = self.client.post('/api/comptes/', {
            'username': 'dar2', 'role': Role.DAR, 'last_name': 'X',
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reset_password_compte(self):
        self.client.force_authenticate(self.superadmin)
        r = self.client.post(f'/api/comptes/{self.chef.id}/reset-password/', {}, format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn('mot_de_passe_genere', r.data)

    # ── Règles dynamiques & objectifs ────────────────────────────────────────
    def test_creation_regle_dynamique(self):
        self.client.force_authenticate(self.superadmin)
        r = self.client.post('/api/regles-solver/', {
            'nom': 'Max 3 cours par jour', 'template': 'MAX_COURS_JOUR_FILIERE',
            'parametres': {'max': 3},
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data['categorie'], 'DYNAMIQUE')
        self.assertFalse(r.data['verrouillee'])
        self.assertTrue(r.data['code'].startswith('R_'))

    def test_creation_regle_dynamique_parametres_invalides(self):
        self.client.force_authenticate(self.superadmin)
        r = self.client.post('/api/regles-solver/', {
            'nom': 'Max invalide', 'template': 'MAX_COURS_JOUR_FILIERE',
            'parametres': {'max': 0},   # min = 1
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reordonner_objectifs(self):
        self.client.force_authenticate(self.superadmin)
        ids = list(FonctionObjectif.objects.order_by('priorite').values_list('id', flat=True))
        inverse = list(reversed(ids))
        r = self.client.post('/api/fonctions-objectif/reordonner/', {'ordre': inverse}, format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        premier = FonctionObjectif.objects.get(id=inverse[0])
        self.assertEqual(premier.priorite, 1)

    def test_catalogue_templates(self):
        self.client.force_authenticate(self.superadmin)
        r = self.client.get('/api/regles-solver/templates/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        noms = {t['template'] for t in r.data}
        self.assertIn('MAX_COURS_JOUR_FILIERE', noms)

    def test_stats_superadmin(self):
        self.client.force_authenticate(self.superadmin)
        r = self.client.get('/api/stats-superadmin/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn('comptes', r.data)
        self.assertIn('regles', r.data)
        self.assertIn('objectifs', r.data)
