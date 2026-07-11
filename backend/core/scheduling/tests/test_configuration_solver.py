"""
Tests de la configuration pilotable du solver (super-admin).

Couvre :
- « golden » : la config par défaut (None) == config explicite par défaut ;
- l'effet d'une règle DYNAMIQUE (interdiction / plafond) sur le placement ;
- le paramétrage d'un objectif (priorité par statut).

Les 21 tests de `test_solver.py` restent le vrai garde-fou de non-régression :
ils s'exécutent désormais à travers le registre et doivent toujours passer.
"""

from core.constants import Creneau, Jour, StatutEnseignant, TypeSalle
from core.models import Salle
from core.scheduling.registre import DEFAUT_OBJECTIFS, DEFAUT_REGLES
from core.scheduling.solver import PlanningSolver
from core.scheduling.tests.test_solver import _SolverTestBase


class ConfigurationSolverTests(_SolverTestBase):

    def _salle(self, nom='A', cap=50, campus=None, type_salle=TypeSalle.COURS):
        return Salle.objects.create(
            nom=nom, campus=campus or self.campus_eb, capacite=cap, type_salle=type_salle,
        )

    # ── Golden : défaut implicite == défaut explicite ────────────────────────
    def test_defaut_none_egale_defaut_explicite(self):
        """Passer regles/objectifs=None doit donner le même résultat que la
        configuration par défaut explicite (registre)."""
        salle = self._salle()
        f_l2 = self.fil_eb_l1.__class__.objects.create(
            code='TST', niveau='L2', ville=self.fil_eb_l1.ville,
            nom='TST L2', departement=self.dept, effectif=30,
        )
        ue2 = self.ue1.__class__.objects.create(code='TST201', intitule='UE 2', filiere=f_l2)
        perm = self._enseignant(nom='PERM', statut=StatutEnseignant.PERMANENT)
        vac  = self._enseignant(nom='VAC',  statut=StatutEnseignant.VACATAIRE)
        imp = self._import()
        d_perm = self._demande(import_source=imp, enseignant=perm, creneau=Creneau.C0, effectif=30)
        d_vac  = self._demande(import_source=imp, filiere=f_l2, ue=ue2, enseignant=vac,
                               creneau=Creneau.C0, effectif=30)

        res_none = PlanningSolver([d_perm, d_vac], [salle]).solve(time_limit_sec=5)
        res_expl = PlanningSolver(
            [d_perm, d_vac], [salle],
            regles=DEFAUT_REGLES, objectifs=DEFAUT_OBJECTIFS,
        ).solve(time_limit_sec=5)

        aff_none = {p.demande_id: p.salle_id for p in res_none.placements}
        aff_expl = {p.demande_id: p.salle_id for p in res_expl.placements}
        self.assertEqual(aff_none, aff_expl)
        # Et le comportement métier attendu : le vacataire passe.
        self.assertEqual(list(aff_none.keys()), [d_vac.id])

    # ── Règle dynamique : interdire un créneau ───────────────────────────────
    def test_regle_dynamique_interdire_creneau(self):
        """Une règle INTERDIRE_CRENEAU empêche tout placement sur ce créneau."""
        salle = self._salle()
        imp = self._import()
        d = self._demande(import_source=imp, creneau=Creneau.C0)

        # Sans règle → placé.
        self.assertEqual(len(PlanningSolver([d], [salle]).solve(time_limit_sec=5).placements), 1)

        # Avec la règle dynamique interdisant C0 → non placé.
        regles = DEFAUT_REGLES + [{
            'code': 'R_TEST_INTERDIRE_C0', 'template': 'INTERDIRE_CRENEAU',
            'parametres': {'creneau': int(Creneau.C0)},
        }]
        res = PlanningSolver([d], [salle], regles=regles).solve(time_limit_sec=5)
        self.assertEqual(len(res.placements), 0)

    # ── Règle dynamique : plafond de cours par jour et par filière ───────────
    def test_regle_dynamique_max_cours_jour_filiere(self):
        """MAX_COURS_JOUR_FILIERE = 1 → une filière avec 2 cours le même jour
        n'en garde qu'un."""
        salle = self._salle()
        imp = self._import()
        d0 = self._demande(import_source=imp, jour=Jour.LUNDI, creneau=Creneau.C0)
        d1 = self._demande(import_source=imp, jour=Jour.LUNDI, creneau=Creneau.C1)

        # Sans règle : les deux passent (créneaux distincts).
        self.assertEqual(len(PlanningSolver([d0, d1], [salle]).solve(time_limit_sec=5).placements), 2)

        # Avec plafond 1/jour : un seul.
        regles = DEFAUT_REGLES + [{
            'code': 'R_MAX1_JOUR', 'template': 'MAX_COURS_JOUR_FILIERE',
            'parametres': {'max': 1},
        }]
        res = PlanningSolver([d0, d1], [salle], regles=regles).solve(time_limit_sec=5)
        self.assertEqual(len(res.placements), 1)

    # ── Objectif paramétrable : inverser la priorité de statut ───────────────
    def test_objectif_priorite_statut_parametrable(self):
        """En réglant PRIORITE_STATUT sur PERMANENT, c'est le permanent qui
        passe avant le vacataire (comportement inverse du défaut)."""
        salle = self._salle()
        f_l2 = self.fil_eb_l1.__class__.objects.create(
            code='TST', niveau='L2', ville=self.fil_eb_l1.ville,
            nom='TST L2', departement=self.dept, effectif=30,
        )
        ue2 = self.ue1.__class__.objects.create(code='TST201', intitule='UE 2', filiere=f_l2)
        perm = self._enseignant(nom='PERM', statut=StatutEnseignant.PERMANENT)
        vac  = self._enseignant(nom='VAC',  statut=StatutEnseignant.VACATAIRE)
        imp = self._import()
        d_perm = self._demande(import_source=imp, enseignant=perm, creneau=Creneau.C0, effectif=30)
        d_vac  = self._demande(import_source=imp, filiere=f_l2, ue=ue2, enseignant=vac,
                               creneau=Creneau.C0, effectif=30)

        objectifs = [
            {'code': 'OBJ_MAX_COURS',   'template': None,              'parametres': {},                       'priorite': 1},
            {'code': 'OBJ_PERMANENTS',  'template': 'PRIORITE_STATUT', 'parametres': {'statut': 'PERMANENT'},  'priorite': 2},
        ]
        res = PlanningSolver([d_perm, d_vac], [salle], objectifs=objectifs).solve(time_limit_sec=5)
        self.assertEqual([p.demande_id for p in res.placements], [d_perm.id])
