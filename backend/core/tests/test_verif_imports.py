"""
Tests de la vérification intelligente des imports (fonctionnalité C).

1. Suggestion de faute de frappe : un enseignant mal orthographié produit une
   erreur enrichie « Vouliez-vous dire … ? » (difflib).
2. Avertissement inter-départements : un enseignant partagé déjà programmé au
   même créneau par un autre département est signalé (non bloquant).
"""

from datetime import date

from django.test import TestCase

from core.constants import (
    Creneau, Grade, Jour, Niveau, Semestre, StatutSemaine, TypeCours, Ville,
)
from core.models import (
    AnneeAcademique, DemandeCours, Departement, Enseignant, Filiere,
    ImportPlanning, Semaine, UE, User,
)
from core.models import IndisponibiliteEnseignant
from core.services.excel_service import _suggerer_enseignant, _index_enseignants_par_libelle
from core.services.verif_imports import analyser_avertissements


class FuzzyEnseignantTests(TestCase):
    def setUp(self):
        self.dept = Departement.objects.create(nom='Informatique', code='INF')
        self.ens  = Enseignant.objects.create(nom='Mbarga Jean', grade=Grade.DR)
        self.ens.departements.add(self.dept)

    def test_suggere_le_bon_enseignant_sur_faute_de_frappe(self):
        idx = _index_enseignants_par_libelle(self.dept)
        # « Dr Mbargah Jean » (h en trop) → doit proposer « Dr Mbarga Jean ».
        proche = _suggerer_enseignant('Dr Mbargah Jean', idx)
        self.assertEqual(proche, 'Dr Mbarga Jean')

    def test_pas_de_suggestion_si_trop_different(self):
        idx = _index_enseignants_par_libelle(self.dept)
        self.assertIsNone(_suggerer_enseignant('Pr Tchoumi Paul', idx))


class _RapportFake:
    """Mini-rapport pour tester analyser_avertissements sans parser un Excel."""
    def __init__(self, lignes):
        self.lignes_valides = lignes


class _LigneFake:
    def __init__(self, ligne_num, enseignant_id, jour, creneau):
        self.ligne_num = ligne_num
        self.enseignant_id = enseignant_id
        self.jour = jour
        self.creneau = creneau


class AvertissementsInterDeptTests(TestCase):
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
        self.dar = User.objects.create(username='dar_test')
        # Enseignant PARTAGÉ entre deux départements.
        self.dept_a = Departement.objects.create(nom='Informatique', code='INF')
        self.dept_b = Departement.objects.create(nom='Mathématiques', code='MAT')
        self.ens = Enseignant.objects.create(nom='Mbarga Jean', grade=Grade.DR)
        self.ens.departements.add(self.dept_a, self.dept_b)

        # Le département B a DÉJÀ déposé : l'enseignant occupe Lundi C0.
        fil_b = Filiere.objects.create(code='MAT', niveau=Niveau.L1, ville=Ville.EBOLOWA,
                                       nom='MAT L1', departement=self.dept_b, effectif=30)
        ue_b = UE.objects.create(code='MAT101', intitule='Analyse', filiere=fil_b)
        imp_b = ImportPlanning.objects.create(semaine=self.semaine, departement=self.dept_b,
                                              uploaded_by=self.dar, fichier='b.xlsx')
        DemandeCours.objects.create(
            import_source=imp_b, filiere=fil_b, ue=ue_b, enseignant=self.ens,
            effectif_declare=30, jour=Jour.LUNDI, creneau=Creneau.C0, type_cours=TypeCours.CM,
        )

    def test_conflit_inter_departement_signale(self):
        # Le département A tente de programmer le MÊME enseignant au MÊME créneau.
        rapport = _RapportFake([_LigneFake(5, self.ens.id, Jour.LUNDI, Creneau.C0)])
        av = analyser_avertissements(rapport, self.dept_a, self.semaine)
        self.assertEqual(len(av), 1)
        self.assertEqual(av[0]['ligne'], 5)
        self.assertIn('Mathématiques', av[0]['message'])

    def test_pas_de_conflit_sur_autre_creneau(self):
        rapport = _RapportFake([_LigneFake(5, self.ens.id, Jour.LUNDI, Creneau.C1)])
        self.assertEqual(analyser_avertissements(rapport, self.dept_a, self.semaine), [])

    def test_avertissement_si_enseignant_indisponible(self):
        # Indispo sur un créneau SANS conflit inter-dépt (Mardi C2) → seul
        # l'avertissement d'indisponibilité doit apparaître.
        IndisponibiliteEnseignant.objects.create(
            enseignant=self.ens, type=IndisponibiliteEnseignant.Type.PONCTUELLE,
            jour=Jour.MARDI, creneau=Creneau.C2, semaine=self.semaine,
        )
        rapport = _RapportFake([_LigneFake(7, self.ens.id, Jour.MARDI, Creneau.C2)])
        av = analyser_avertissements(rapport, self.dept_a, self.semaine)
        self.assertTrue(any('indisponible' in a['message'].lower() for a in av))
