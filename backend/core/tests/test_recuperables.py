"""
Tests de la récupération des créneaux libérés (Phase D).

- Les cours non placés re-posables sont renvoyés, VACATAIRES en premier.
- Chaque cours porte des suggestions actionnables (jour/créneau/salle).
"""

from datetime import date

from django.test import TestCase

from core.constants import (
    Creneau, Grade, Jour, Niveau, Semestre, StatutEnseignant, StatutSemaine,
    TypeCours, TypeSalle, Ville,
)
from core.models import (
    AnneeAcademique, Campus, DemandeCours, Departement, Enseignant, Filiere,
    ImportPlanning, Salle, Seance, Semaine, UE, User,
)
from core.scheduling.conseiller import calculer_recuperables


class RecuperablesTests(TestCase):
    def setUp(self):
        self.annee = AnneeAcademique.objects.create(
            libelle='2025-2026', date_debut=date(2025, 10, 1),
            date_fin=date(2026, 7, 31), active=True,
        )
        self.semaine = Semaine.objects.create(
            annee_academique=self.annee, date_debut=date(2026, 6, 8),
            date_fin=date(2026, 6, 13), semestre=Semestre.S1, statut=StatutSemaine.GENERE,
        )
        self.dept = Departement.objects.create(nom='Informatique', code='INF')
        self.campus = Campus.objects.create(nom='Campus EB', ville=Ville.EBOLOWA)
        self.salle = Salle.objects.create(nom='A', campus=self.campus, capacite=50, type_salle=TypeSalle.COURS)
        self.dar = User.objects.create(username='dar_test')
        self.imp = ImportPlanning.objects.create(
            semaine=self.semaine, departement=self.dept, uploaded_by=self.dar, fichier='x.xlsx',
        )

        def _filiere(niveau, nom):
            return Filiere.objects.create(code='INF', niveau=niveau, ville=Ville.EBOLOWA,
                                          nom=nom, departement=self.dept, effectif=30)

        self.f1 = _filiere(Niveau.L1, 'INF L1')
        self.f2 = _filiere(Niveau.L2, 'INF L2')
        self.f3 = _filiere(Niveau.L3, 'INF L3')
        self.u1 = UE.objects.create(code='INF101', intitule='Algo', filiere=self.f1)
        self.u2 = UE.objects.create(code='INF201', intitule='Réseaux', filiere=self.f2)
        self.u3 = UE.objects.create(code='INF301', intitule='IA', filiere=self.f3)

        self.perm = Enseignant.objects.create(nom='Permanent P', grade=Grade.DR, statut=StatutEnseignant.PERMANENT)
        self.vac  = Enseignant.objects.create(nom='Vacataire V', grade=Grade.PR, statut=StatutEnseignant.VACATAIRE)
        for e in (self.perm, self.vac):
            e.departements.add(self.dept)

        # 3 cours au même créneau (lundi C0). d1 est PLACÉ (occupe la salle).
        self.d1 = DemandeCours.objects.create(import_source=self.imp, filiere=self.f1, ue=self.u1,
            enseignant=self.perm, effectif_declare=30, jour=Jour.LUNDI, creneau=Creneau.C0, type_cours=TypeCours.CM)
        self.d2 = DemandeCours.objects.create(import_source=self.imp, filiere=self.f2, ue=self.u2,
            enseignant=self.perm, effectif_declare=30, jour=Jour.LUNDI, creneau=Creneau.C0, type_cours=TypeCours.CM)
        self.d3 = DemandeCours.objects.create(import_source=self.imp, filiere=self.f3, ue=self.u3,
            enseignant=self.vac, effectif_declare=30, jour=Jour.LUNDI, creneau=Creneau.C0, type_cours=TypeCours.CM)

        # d1 placé → la salle A est occupée lundi C0.
        Seance.objects.create(semaine=self.semaine, demande_origine=self.d1, filiere=self.f1,
            ue=self.u1, enseignant=self.perm, salle=self.salle, jour=Jour.LUNDI,
            creneau=Creneau.C0, type_cours=TypeCours.CM)

    def test_vacataire_en_premier_avec_suggestions(self):
        rec = calculer_recuperables(self.semaine)
        # d2 et d3 sont non placés et re-posables (autres créneaux libres).
        ids = [r['demande_id'] for r in rec]
        self.assertIn(self.d2.id, ids)
        self.assertIn(self.d3.id, ids)
        # Le vacataire (d3) doit être en TÊTE.
        self.assertEqual(rec[0]['demande_id'], self.d3.id)
        self.assertTrue(rec[0]['vacataire'])
        # Chaque entrée a au moins une suggestion actionnable.
        for r in rec:
            self.assertTrue(r['suggestions'])
            self.assertTrue(all('salle_id' in s for s in r['suggestions']))

    def test_aucun_recuperable_si_tout_place(self):
        # On place aussi d2 et d3 ailleurs → plus rien à récupérer.
        Seance.objects.create(semaine=self.semaine, demande_origine=self.d2, filiere=self.f2,
            ue=self.u2, enseignant=self.perm, salle=self.salle, jour=Jour.MARDI,
            creneau=Creneau.C0, type_cours=TypeCours.CM)
        Seance.objects.create(semaine=self.semaine, demande_origine=self.d3, filiere=self.f3,
            ue=self.u3, enseignant=self.vac, salle=self.salle, jour=Jour.MERCREDI,
            creneau=Creneau.C0, type_cours=TypeCours.CM)
        self.assertEqual(calculer_recuperables(self.semaine), [])
