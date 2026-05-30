"""
Test end-to-end de l'Assistant de résolution (fonctionnalité B), via l'API.

Scénario : une seule salle, deux cours au même créneau → un cours ne peut pas
être placé. On vérifie que :
  1. POST /generer/ renvoie le cours non placé AVEC raisons + suggestions
     actionnables (jour/créneau/salle) ;
  2. POST /placer-cours/ applique une suggestion et crée la Seance (niveau 2) ;
  3. ré-appliquer le même cours est refusé (déjà placé) ;
  4. un placement sur un créneau déjà occupé est refusé (conflit 409).

S'exécute sur une base de test isolée (aucun impact sur la base de dev).
"""

from datetime import date

from rest_framework.test import APITestCase

from core.constants import (
    Creneau, Jour, Niveau, Role, Semestre, StatutSemaine, TypeCours, TypeSalle, Ville,
)
from core.models import (
    AnneeAcademique, Campus, DemandeCours, Departement, Filiere,
    ImportPlanning, Salle, Seance, Semaine, UE, User,
)


class AssistantResolutionApiTests(APITestCase):
    def setUp(self):
        self.annee = AnneeAcademique.objects.create(
            libelle='2025-2026', date_debut=date(2025, 10, 1),
            date_fin=date(2026, 7, 31), active=True,
        )
        self.semaine = Semaine.objects.create(
            annee_academique=self.annee,
            date_debut=date(2026, 6, 8), date_fin=date(2026, 6, 13),
            semestre=Semestre.S1, statut=StatutSemaine.IMPORTS_CLOTURES,
        )
        self.dar = User.objects.create(username='dar_test', role=Role.DAR)
        self.dar.set_password('dar-pass-123'); self.dar.save()

        self.campus = Campus.objects.create(nom='Campus EB', ville=Ville.EBOLOWA)
        # Une SEULE salle → force le conflit de placement.
        self.salle = Salle.objects.create(
            nom='A', campus=self.campus, capacite=50, type_salle=TypeSalle.COURS,
        )
        self.dept = Departement.objects.create(nom='Informatique', code='INF')

        self.f1 = Filiere.objects.create(
            code='INF', niveau=Niveau.L1, ville=Ville.EBOLOWA,
            nom='INF L1', departement=self.dept, effectif=30,
        )
        self.f2 = Filiere.objects.create(
            code='INF', niveau=Niveau.L2, ville=Ville.EBOLOWA,
            nom='INF L2', departement=self.dept, effectif=30,
        )
        self.ue1 = UE.objects.create(code='INF101', intitule='Algo', filiere=self.f1)
        self.ue2 = UE.objects.create(code='INF201', intitule='Réseaux', filiere=self.f2)

        self.imp = ImportPlanning.objects.create(
            semaine=self.semaine, departement=self.dept,
            uploaded_by=self.dar, fichier='dummy.xlsx',
        )
        # Deux cours, deux classes, MÊME jour + créneau → une seule salle dispo.
        self.d1 = DemandeCours.objects.create(
            import_source=self.imp, filiere=self.f1, ue=self.ue1,
            effectif_declare=30, jour=Jour.LUNDI, creneau=Creneau.C0, type_cours=TypeCours.CM,
        )
        self.d2 = DemandeCours.objects.create(
            import_source=self.imp, filiere=self.f2, ue=self.ue2,
            effectif_declare=30, jour=Jour.LUNDI, creneau=Creneau.C0, type_cours=TypeCours.CM,
        )

    def _auth_dar(self):
        r = self.client.post('/api/auth/login/', {'username': 'dar_test', 'password': 'dar-pass-123'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")

    def test_generation_puis_application_suggestion(self):
        self._auth_dar()

        # 1) Génération
        r = self.client.post(f'/api/semaines/{self.semaine.id}/generer/')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.data['placees'], 1)
        non_places = r.data['non_placees']
        self.assertEqual(len(non_places), 1)

        cours = non_places[0]
        # Descripteur lisible + raisons + suggestions présents
        for champ in ('ue', 'classe', 'jour', 'creneau', 'raisons', 'suggestions'):
            self.assertIn(champ, cours)
        self.assertTrue(cours['raisons'])
        actionnables = [s for s in cours['suggestions'] if s.get('salle_id') is not None]
        self.assertTrue(actionnables, "Au moins une suggestion actionnable attendue")

        sugg = actionnables[0]

        # 2) Application de la suggestion (niveau 2)
        r = self.client.post(f'/api/semaines/{self.semaine.id}/placer-cours/', {
            'demande_id': cours['demande_id'],
            'jour':       sugg['jour'],
            'creneau':    sugg['creneau'],
            'salle_id':   sugg['salle_id'],
        }, format='json')
        self.assertEqual(r.status_code, 201, r.content)

        # La Seance a bien été créée pour ce cours, marquée manuelle.
        seance = Seance.objects.get(semaine=self.semaine, demande_origine_id=cours['demande_id'])
        self.assertEqual(seance.jour, sugg['jour'])
        self.assertEqual(seance.creneau, sugg['creneau'])
        self.assertTrue(seance.modifie_manuellement)

        # 3) Ré-appliquer le même cours → refusé (déjà placé)
        r = self.client.post(f'/api/semaines/{self.semaine.id}/placer-cours/', {
            'demande_id': cours['demande_id'],
            'jour':       sugg['jour'], 'creneau': sugg['creneau'], 'salle_id': sugg['salle_id'],
        }, format='json')
        self.assertEqual(r.status_code, 400, r.content)

    def test_placement_sur_creneau_occupe_refuse(self):
        self._auth_dar()
        self.client.post(f'/api/semaines/{self.semaine.id}/generer/')

        # Le créneau d'origine (Lundi C0) est occupé par le cours placé.
        non_place = self.client.post(f'/api/semaines/{self.semaine.id}/generer/').data['non_placees'][0]
        r = self.client.post(f'/api/semaines/{self.semaine.id}/placer-cours/', {
            'demande_id': non_place['demande_id'],
            'jour': Jour.LUNDI, 'creneau': Creneau.C0, 'salle_id': self.salle.id,
        }, format='json')
        self.assertEqual(r.status_code, 409, r.content)
