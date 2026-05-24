"""
Tests unitaires du solver FSChrono v2.

Les 9 tests obligatoires du brief §9 sont implémentés ici :
    1. test_cas_simple
    2. test_conflit_salle
    3. test_filiere_ebolowa_force_ebolowa
    4. test_filiere_monatele_force_monatele
    5. test_buffer_inter_ville
    6. test_respect_capacite
    7. test_tp_force_salle_adaptee
    8. test_enseignant_multi_creneaux
    9. test_meme_filiere_deux_villes

Chaque test crée son propre mini-référentiel (campus, salles, dept,
filière, enseignant, UE, semaine, import, demandes). On évite seed_demo
pour rester déterministe et isoler les cas.
"""

from datetime import date

from django.test import TestCase

from core.constants import (
    Creneau,
    Grade,
    Jour,
    Niveau,
    Role,
    Semestre,
    StatutSemaine,
    TypeCours,
    TypeSalle,
    Ville,
)
from core.models import (
    AnneeAcademique,
    Campus,
    DemandeCours,
    Departement,
    Enseignant,
    Filiere,
    ImportPlanning,
    Salle,
    Semaine,
    UE,
    User,
)
from core.scheduling.solver import PlanningSolver


# ═════════════════════════════════════════════════════════════════════════════
# Fixture commune
# ═════════════════════════════════════════════════════════════════════════════
class _SolverTestBase(TestCase):
    """Crée le strict minimum partagé par tous les tests."""

    @classmethod
    def setUpTestData(cls):
        cls.annee = AnneeAcademique.objects.create(
            libelle='2025-2026', date_debut=date(2025, 10, 1),
            date_fin=date(2026, 7, 31), active=True,
        )
        cls.semaine = Semaine.objects.create(
            annee_academique=cls.annee,
            date_debut=date(2026, 5, 25), date_fin=date(2026, 5, 30),
            semestre=Semestre.S1, statut=StatutSemaine.IMPORTS_CLOTURES,
        )
        cls.dar = User.objects.create(
            username='dar_test', role=Role.DAR, is_superuser=True, is_staff=True,
        )

        # Campus dans les 2 villes
        cls.campus_eb = Campus.objects.create(nom='Campus Principal Test EB', ville=Ville.EBOLOWA)
        cls.campus_mo = Campus.objects.create(nom='Campus Test MO',           ville=Ville.MONATELE)

        # Département pédagogique
        cls.dept = Departement.objects.create(nom='Département Test', code='TST')

        # Filières standards par défaut (chaque test peut en créer d'autres)
        cls.fil_eb_l1 = Filiere.objects.create(
            code='TST', niveau=Niveau.L1, ville=Ville.EBOLOWA,
            nom='TST L1', departement=cls.dept, effectif=30,
        )

        # UE de base
        cls.ue1 = UE.objects.create(code='TST101', intitule='UE Test 1', filiere=cls.fil_eb_l1)

    def _enseignant(self, nom='DUPONT', grade=Grade.DR):
        return Enseignant.objects.create(nom=nom, grade=grade)

    def _import(self):
        """Crée un ImportPlanning fictif pour rattacher les DemandeCours."""
        return ImportPlanning.objects.create(
            semaine=self.semaine, departement=self.dept,
            uploaded_by=self.dar, fichier='dummy.xlsx',
        )

    def _demande(self, *, import_source, filiere=None, ue=None, enseignant=None,
                 jour=Jour.LUNDI, creneau=Creneau.C0, type_cours=TypeCours.CM,
                 effectif=None):
        f = filiere or self.fil_eb_l1
        return DemandeCours.objects.create(
            import_source=import_source,
            filiere=f, ue=ue or self.ue1,
            enseignant=enseignant,
            effectif_declare=effectif if effectif is not None else f.effectif,
            jour=jour, creneau=creneau, type_cours=type_cours,
        )

    def _solve(self, demandes, salles):
        return PlanningSolver(list(demandes), list(salles)).solve(time_limit_sec=5)


# ═════════════════════════════════════════════════════════════════════════════
# Tests obligatoires
# ═════════════════════════════════════════════════════════════════════════════
class SolverTests(_SolverTestBase):

    # 1 ───────────────────────────────────────────────────────────────────────
    def test_cas_simple(self):
        """Une demande, une salle compatible → placée."""
        salle = Salle.objects.create(
            nom='A', campus=self.campus_eb, capacite=50, type_salle=TypeSalle.COURS,
        )
        imp = self._import()
        d = self._demande(import_source=imp)

        result = self._solve([d], [salle])

        self.assertEqual(len(result.placements), 1)
        self.assertEqual(result.placements[0].demande_id, d.id)
        self.assertEqual(result.placements[0].salle_id,   salle.id)
        self.assertEqual(len(result.non_places), 0)

    # 2 ───────────────────────────────────────────────────────────────────────
    def test_conflit_salle(self):
        """Deux demandes, même créneau, une seule salle compatible → 1 placée."""
        salle = Salle.objects.create(
            nom='A', campus=self.campus_eb, capacite=50, type_salle=TypeSalle.COURS,
        )
        imp = self._import()

        # Deux filières distinctes pour ne pas violer H4 avant H2 (sinon
        # le test pourrait être ambigu sur la cause du non-placement)
        f_l2 = Filiere.objects.create(
            code='TST', niveau=Niveau.L2, ville=Ville.EBOLOWA,
            nom='TST L2', departement=self.dept, effectif=25,
        )
        ue2 = UE.objects.create(code='TST201', intitule='UE Test 2', filiere=f_l2)

        d1 = self._demande(import_source=imp)
        d2 = self._demande(import_source=imp, filiere=f_l2, ue=ue2)

        result = self._solve([d1, d2], [salle])

        self.assertEqual(len(result.placements), 1)
        self.assertEqual(len(result.non_places), 1)
        # La demande non placée doit avoir une raison renseignée
        self.assertTrue(len(result.non_places[0].raisons) > 0)

    # 3 ───────────────────────────────────────────────────────────────────────
    def test_filiere_ebolowa_force_ebolowa(self):
        """Filière Ébolowa avec salles dans les 2 villes → choix Ébolowa."""
        salle_eb = Salle.objects.create(
            nom='A',  campus=self.campus_eb, capacite=50, type_salle=TypeSalle.COURS,
        )
        salle_mo = Salle.objects.create(
            nom='AM', campus=self.campus_mo, capacite=50, type_salle=TypeSalle.COURS,
        )
        imp = self._import()
        d = self._demande(import_source=imp)  # filière par défaut = Ébolowa

        result = self._solve([d], [salle_eb, salle_mo])

        self.assertEqual(len(result.placements), 1)
        self.assertEqual(result.placements[0].salle_id, salle_eb.id)

    # 4 ───────────────────────────────────────────────────────────────────────
    def test_filiere_monatele_force_monatele(self):
        """Symétrique : filière Monatélé → salle Monatélé."""
        salle_eb = Salle.objects.create(
            nom='A',  campus=self.campus_eb, capacite=50, type_salle=TypeSalle.COURS,
        )
        salle_mo = Salle.objects.create(
            nom='AM', campus=self.campus_mo, capacite=50, type_salle=TypeSalle.COURS,
        )
        f_mo = Filiere.objects.create(
            code='TST', niveau=Niveau.L1, ville=Ville.MONATELE,
            nom='TST L1', departement=self.dept, effectif=20,
        )
        ue_mo = UE.objects.create(code='TST101M', intitule='UE Monatélé', filiere=f_mo)
        imp = self._import()
        d = self._demande(import_source=imp, filiere=f_mo, ue=ue_mo)

        result = self._solve([d], [salle_eb, salle_mo])

        self.assertEqual(len(result.placements), 1)
        self.assertEqual(result.placements[0].salle_id, salle_mo.id)

    # 5 ───────────────────────────────────────────────────────────────────────
    def test_buffer_inter_ville(self):
        """
        Prof à Ébolowa créneau C0 ET Monatélé créneau C1 → 1 seul placé.
        Sans buffer le solver placerait les deux ; la contrainte H8 force
        le sacrifice.
        """
        salle_eb = Salle.objects.create(
            nom='A',  campus=self.campus_eb, capacite=50, type_salle=TypeSalle.COURS,
        )
        salle_mo = Salle.objects.create(
            nom='AM', campus=self.campus_mo, capacite=50, type_salle=TypeSalle.COURS,
        )
        f_mo = Filiere.objects.create(
            code='TST', niveau=Niveau.L1, ville=Ville.MONATELE,
            nom='TST L1 MO', departement=self.dept, effectif=20,
        )
        ue_mo = UE.objects.create(code='TST101M', intitule='UE MO', filiere=f_mo)

        prof = self._enseignant()
        imp = self._import()
        d_eb = self._demande(import_source=imp, enseignant=prof,
                             jour=Jour.LUNDI, creneau=Creneau.C0)
        d_mo = self._demande(import_source=imp, filiere=f_mo, ue=ue_mo, enseignant=prof,
                             jour=Jour.LUNDI, creneau=Creneau.C1)

        result = self._solve([d_eb, d_mo], [salle_eb, salle_mo])

        self.assertEqual(len(result.placements), 1)
        self.assertEqual(len(result.non_places), 1)

    # 6 ───────────────────────────────────────────────────────────────────────
    def test_respect_capacite(self):
        """Effectif 100, salles 50 et 200 → choix 200."""
        salle_petite = Salle.objects.create(
            nom='Petite', campus=self.campus_eb, capacite=50,  type_salle=TypeSalle.COURS,
        )
        salle_grande = Salle.objects.create(
            nom='Grande', campus=self.campus_eb, capacite=200, type_salle=TypeSalle.COURS,
        )
        # Modifier la filière par défaut pour avoir effectif 100
        self.fil_eb_l1.effectif = 100
        self.fil_eb_l1.save()

        imp = self._import()
        d = self._demande(import_source=imp, effectif=100)

        result = self._solve([d], [salle_petite, salle_grande])

        self.assertEqual(len(result.placements), 1)
        self.assertEqual(result.placements[0].salle_id, salle_grande.id)

    # 7 ───────────────────────────────────────────────────────────────────────
    def test_tp_force_salle_adaptee(self):
        """type_cours=TP → exclut COURS classique, accepte LABO/TP/MULTIMEDIA."""
        salle_cours = Salle.objects.create(
            nom='A',    campus=self.campus_eb, capacite=50, type_salle=TypeSalle.COURS,
        )
        salle_labo = Salle.objects.create(
            nom='Labo', campus=self.campus_eb, capacite=50, type_salle=TypeSalle.LABO,
        )
        imp = self._import()
        d = self._demande(import_source=imp, type_cours=TypeCours.TP)

        result = self._solve([d], [salle_cours, salle_labo])

        self.assertEqual(len(result.placements), 1)
        self.assertEqual(result.placements[0].salle_id, salle_labo.id)

    # 8 ───────────────────────────────────────────────────────────────────────
    def test_enseignant_multi_creneaux(self):
        """
        Même enseignant, MÊME ville, créneaux ESPACÉS (C0 et C2) → tous placés.
        Pas un conflit (l'enseignant peut donner 2 cours dans la journée).
        """
        salle = Salle.objects.create(
            nom='A', campus=self.campus_eb, capacite=50, type_salle=TypeSalle.COURS,
        )
        f_l2 = Filiere.objects.create(
            code='TST', niveau=Niveau.L2, ville=Ville.EBOLOWA,
            nom='TST L2', departement=self.dept, effectif=25,
        )
        ue2 = UE.objects.create(code='TST201', intitule='UE Test 2', filiere=f_l2)

        prof = self._enseignant()
        imp = self._import()
        d1 = self._demande(import_source=imp, enseignant=prof, creneau=Creneau.C0)
        d2 = self._demande(import_source=imp, filiere=f_l2, ue=ue2,
                           enseignant=prof, creneau=Creneau.C2)

        result = self._solve([d1, d2], [salle])

        self.assertEqual(len(result.placements), 2)
        self.assertEqual(len(result.non_places), 0)

    # 9 ───────────────────────────────────────────────────────────────────────
    def test_meme_filiere_deux_villes(self):
        """
        Même filière pédagogique présente à Ébolowa ET Monatélé, MÊME jour
        et MÊME créneau → chacune placée dans sa ville (deux placées au total).
        Cas réel : "Production Animale L1" SBAA, classes distinctes physiquement.
        """
        f_eb = self.fil_eb_l1  # déjà créée à Ébolowa
        f_mo = Filiere.objects.create(
            code='TST', niveau=Niveau.L1, ville=Ville.MONATELE,
            nom='TST L1', departement=self.dept, effectif=20,
        )
        ue_mo = UE.objects.create(code='TST101M', intitule='UE Monatélé', filiere=f_mo)

        salle_eb = Salle.objects.create(
            nom='A',  campus=self.campus_eb, capacite=50, type_salle=TypeSalle.COURS,
        )
        salle_mo = Salle.objects.create(
            nom='AM', campus=self.campus_mo, capacite=50, type_salle=TypeSalle.COURS,
        )
        imp = self._import()
        d_eb = self._demande(import_source=imp, filiere=f_eb,
                             jour=Jour.LUNDI, creneau=Creneau.C0)
        d_mo = self._demande(import_source=imp, filiere=f_mo, ue=ue_mo,
                             jour=Jour.LUNDI, creneau=Creneau.C0)

        result = self._solve([d_eb, d_mo], [salle_eb, salle_mo])

        self.assertEqual(len(result.placements), 2)
        # Chacune dans sa propre ville
        affectations = {p.demande_id: p.salle_id for p in result.placements}
        self.assertEqual(affectations[d_eb.id], salle_eb.id)
        self.assertEqual(affectations[d_mo.id], salle_mo.id)
