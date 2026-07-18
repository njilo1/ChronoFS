"""
Solver de planification FSChrono v2 (OR-Tools CP-SAT).

Particularité importante du problème : le chef de département IMPOSE le
jour et le créneau dans son fichier Excel. Le solver n'a donc qu'une
chose à faire : **choisir UNE salle** pour chaque DemandeCours, sous
contraintes.

Modélisation
============
Variables booléennes :
    x[d, s] = 1  ssi la demande d est placée dans la salle s

Contraintes DURES (jamais violées) :
    H1  ∀d :              Σ_s x[d, s] ≤ 1                 (au plus 1 placement)
    H2  ∀(s, j, c) :     Σ_(d ∈ D(j,c)) x[d, s] ≤ 1      (1 cours par salle/créneau)
    H3  ∀(e, j, c) :     Σ_(d ∈ D(e,j,c)) Σ_s x[d, s] ≤ 1 (1 cours par prof/créneau)
    H4  ∀(f, j, c) :     Σ_(d ∈ D(f,j,c)) Σ_s x[d, s] ≤ 1 (1 cours par classe/créneau)
    H5  ∀(d, s) : x[d,s] = 0  si capacité_s × (1+TOL) < effectif_d
                  (forçage toléré jusqu'à +40 %, sauf TERRAIN illimité)
    H6  ∀(d, s) : x[d,s] = 0  si type_salle non compatible avec type_cours
    H7  ∀(d, s) : x[d,s] = 0  si ville_filière(d) ≠ ville_campus(s)
    H7bis ∀(d,s): x[d,s] = 0  si la filière épingle un campus ≠ campus_s
    H8  Un enseignant n'enseigne que dans UNE seule ville par jour
        (interdit tout aller-retour inter-villes le même jour, quel que
        soit l'écart de créneaux).
    H9  Une filière (= une classe, ex. TIC L3) est placée dans UN SEUL
        campus pour toute la semaine : pas de saut de campus entre deux
        créneaux, même au sein de la même ville.

Objectif (lexicographique, encodé par poids w1 ≫ w2 ≫ w3 ≫ w_cont ≫ w_cap) :
    1. Maximiser le NOMBRE de cours placés → « tous les cours de la
       semaine doivent être faits ».
    2. Priorité aux VACATAIRES (leurs cours passent avant les permanents).
    3. Équité entre filières : à nombre de cours égal, sacrifier d'abord
       les filières les plus programmées pour caser les autres.
    4. CONTINUITÉ de salle : une classe garde la même salle d'un créneau au
       suivant et d'un jour à l'autre (on minimise le nombre de salles
       distinctes par filière sur la semaine) → pas de déménagement inutile.
    5. Ajuster capacité ≈ effectif : minimiser le gaspillage de places et
       n'utiliser le forçage (sur-effectif) qu'en dernier recours.

L'algorithme renvoie pour chaque demande non placée la liste des raisons
plausibles, en langage clair — JAMAIS « infeasible » brut au DAR.
"""

from __future__ import annotations

import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Optional

from ortools.sat.python import cp_model

from core.constants import (
    Creneau,
    Jour,
    SALLES_AUTORISEES_PAR_TYPE_COURS,
    salle_speciale_requise,
    StatutEnseignant,
    TOLERANCE_SURCAPACITE,
    TypeSalle,
)
from core.models import DemandeCours, Salle
from core.scheduling.conseiller import calculer_suggestions
from core.scheduling.registre import (
    DEFAUT_OBJECTIFS,
    DEFAUT_REGLES,
    ORDRE_CONTRAINTES_STATIQUES,
    REGISTRE_CONTRAINTES,
    REGISTRE_TEMPLATES,
    SolverContext,
    effectif_demande,
    resoudre_handler_objectif,
    valider_parametres,
)


# ── Capacité considérée comme infinie ────────────────────────────────────────
# Les terrains acceptent n'importe quelle classe (sport, activités spéciales).
CAPACITE_ILLIMITEE_TYPES = {TypeSalle.TERRAIN}

# Pénalité appliquée au forçage (effectif > capacité réelle). Supérieure à 1
# pour que, à choix égal, le solver préfère gaspiller quelques places plutôt
# que de surcharger une salle. Le forçage reste possible (H5 tolérant) mais
# l'objectif le réserve aux cas où aucune salle adéquate n'est libre.
FACTEUR_SURCHARGE = 3


@dataclass
class Placement:
    """Une demande placée dans une salle (résultat positif)."""

    demande_id: int
    salle_id:   int


@dataclass
class NonPlacement:
    """Une demande NON placée + raisons + suggestions de résolution."""

    demande_id:  int
    raisons:     list[str] = field(default_factory=list)
    suggestions: list[str] = field(default_factory=list)


@dataclass
class ResultatPlanification:
    """Sortie complète du solver pour reporting et persistance."""

    placements:   list[Placement]    = field(default_factory=list)
    non_places:   list[NonPlacement] = field(default_factory=list)
    duree_ms:     int                = 0
    statut:       str                = 'OPTIMAL'   # OPTIMAL / FEASIBLE / INFEASIBLE / INTERROMPU
    nb_demandes:  int                = 0
    nb_salles:    int                = 0


# ═════════════════════════════════════════════════════════════════════════════
# Solver
# ═════════════════════════════════════════════════════════════════════════════
class PlanningSolver:
    """
    Solveur d'affectation salles ↔ demandes hebdomadaires.

    Usage :
        result = PlanningSolver(demandes, salles).solve(time_limit_sec=30)
    """

    def __init__(
        self,
        demandes: list[DemandeCours],
        salles: list[Salle],
        indispos=None,
        regles: list[dict] | None = None,
        objectifs: list[dict] | None = None,
    ):
        # On matérialise sous forme de listes ordonnées pour pouvoir indexer.
        self.demandes: list[DemandeCours] = list(demandes)
        self.salles:   list[Salle]        = list(salles)
        # Créneaux où l'enseignant est indisponible : {(enseignant_id, jour, creneau)}.
        # Contrainte DURE : un cours sur un tel créneau ne sera jamais placé.
        self.indispos: set[tuple[int, int, int]] = set(indispos or ())

        # Configuration pilotable (super-admin). `None` → configuration par
        # défaut = comportement historique strictement identique. Chaque entrée
        # est un dict {code, template?, parametres?} ; les objectifs portent en
        # plus un `priorite`. Le solver ne touche JAMAIS à la BDD : la
        # résolution de la config effective est faite en amont (generation_service).
        self.regles:    list[dict] = list(regles)    if regles    is not None else list(DEFAUT_REGLES)
        self.objectifs: list[dict] = list(objectifs) if objectifs is not None else list(DEFAUT_OBJECTIFS)

        # Index par id pour debug / API
        self._idx_demande_par_id: dict[int, int] = {d.id: i for i, d in enumerate(self.demandes)}
        self._idx_salle_par_id:   dict[int, int] = {s.id: i for i, s in enumerate(self.salles)}

        # Liste des indices de salles candidates pour chaque demande (H5/H6/H7).
        # Calculée AVANT la création des variables CP-SAT pour ne créer que
        # les variables strictement utiles.
        self.salles_candidates: list[list[int]] = []

        # Raisons d'élimination préalable (utile pour le rapport humain).
        # demande_idx → set[str]
        self._raisons_pre: dict[int, set[str]] = defaultdict(set)

        self.model  = cp_model.CpModel()
        self.solver = cp_model.CpSolver()

        # x[(d_idx, s_idx)] = BoolVar — clé compactée seulement pour les paires
        # candidates (économise des milliers de vars sur un gros référentiel).
        self.x: dict[tuple[int, int], cp_model.IntVar] = {}

        # placee[d_idx] = somme bornée à 1 → réutilisée pour H3/H4 et objectif.
        self.placee: dict[int, cp_model.LinearExpr] = {}

    # ── Helpers ──────────────────────────────────────────────────────────────
    @staticmethod
    def _effectif(d: DemandeCours) -> int:
        """Effectif retenu pour une demande (déclaré > filière > 1)."""
        return max(1, d.effectif_declare or d.filiere.effectif or 1)

    @staticmethod
    def _est_vacataire(d: DemandeCours) -> bool:
        return bool(d.enseignant and d.enseignant.statut == StatutEnseignant.VACATAIRE)

    # ── Étape 1 : pré-filtrer les salles candidates par demande ─────────────
    def _calculer_candidates(self):
        for d_idx, d in enumerate(self.demandes):
            # Contrainte dure d'indisponibilité : enseignant absent à ce créneau.
            if d.enseignant_id is not None and (d.enseignant_id, d.jour, d.creneau) in self.indispos:
                self._raisons_pre[d_idx] = {
                    f"{d.enseignant.nom} est indisponible "
                    f"{Jour(d.jour).label} {Creneau(d.creneau).label}."
                }
                self.salles_candidates.append([])
                continue

            ville_demande = d.filiere.ville

            # Salle spéciale SBAA (terrain pour les TP, labo pour la chimie) :
            # si la règle impose un type, il prime sur la liste générale —
            # le terrain/labo n'est candidat QUE dans ce cas précis.
            type_special = salle_speciale_requise(
                d.filiere.departement.code, d.type_cours,
                getattr(d.ue, 'intitule', None),
            )
            if type_special is not None:
                types_autorises = [type_special]
            else:
                types_autorises = SALLES_AUTORISEES_PAR_TYPE_COURS.get(d.type_cours, [])

            effectif = self._effectif(d)

            # H7bis — campus imposé (surcharge optionnelle de la ville).
            campus_force = d.filiere.get_campus_contraint()
            campus_force_id = campus_force.id if campus_force else None

            candidates: list[int] = []
            raisons: set[str] = set()

            for s_idx, s in enumerate(self.salles):
                if not s.disponible:
                    continue

                # H7 — Ville stricte
                if s.campus.ville != ville_demande:
                    continue

                # H7bis — Campus imposé : si la filière épingle un campus,
                # on rejette toute salle d'un autre campus (même ville).
                if campus_force_id is not None and s.campus_id != campus_force_id:
                    continue

                # H6 — Type de salle compatible
                if s.type_salle not in types_autorises:
                    continue

                # H5 — Capacité avec tolérance de sur-effectif (sauf TERRAIN).
                # Une salle de 50 places accepte jusqu'à 50×1.40 = 70 étudiants.
                if s.type_salle not in CAPACITE_ILLIMITEE_TYPES:
                    capacite_max = s.capacite * (1 + TOLERANCE_SURCAPACITE)
                    if capacite_max < effectif:
                        continue

                candidates.append(s_idx)

            if not candidates:
                # Diagnostic pour le rapport
                if campus_force_id is not None and not any(
                    s.campus_id == campus_force_id for s in self.salles
                ):
                    raisons.add(
                        f"Le campus imposé « {campus_force.nom} » n'a aucune salle disponible."
                    )
                elif campus_force_id is not None:
                    raisons.add(
                        f"Aucune salle du campus imposé « {campus_force.nom} » n'accepte "
                        f"ce type de cours ({d.type_cours}) avec un effectif de "
                        f"{effectif} personnes."
                    )
                elif not any(s.campus.ville == ville_demande for s in self.salles):
                    raisons.add(f"Aucune salle disponible à {ville_demande}.")
                else:
                    raisons.add(
                        f"Aucune salle de votre ville accepte ce type de cours "
                        f"({d.type_cours}) avec un effectif de {effectif} personnes."
                    )
                self._raisons_pre[d_idx] = raisons

            self.salles_candidates.append(candidates)

    # ── Étape 2 : construire le modèle CP-SAT ───────────────────────────────
    def _construire_modele(self):
        # Variables x[d, s] uniquement pour les paires candidates
        for d_idx, candidates in enumerate(self.salles_candidates):
            for s_idx in candidates:
                self.x[(d_idx, s_idx)] = self.model.NewBoolVar(f'x_d{d_idx}_s{s_idx}')

        # ── H1 : ≤ 1 salle par demande ──────────────────────────────────────
        for d_idx in range(len(self.demandes)):
            vars_d = [self.x[(d_idx, s_idx)] for s_idx in self.salles_candidates[d_idx]]
            # placee[d_idx] = nombre de salles attribuées à d → 0 ou 1 grâce à la contrainte
            if vars_d:
                self.model.Add(sum(vars_d) <= 1)
                self.placee[d_idx] = sum(vars_d)
            else:
                # Aucune salle candidate → placée toujours = 0
                self.placee[d_idx] = 0

        # ── Contexte partagé + agrégats (utilisés par les builders/objectifs) ─
        ctx = self._construire_contexte()
        self._contexte = ctx

        # ── Contraintes dures « model-stage » (H2, H3, H4, H8, H9) ───────────
        # Appliquées via le registre, dans l'ordre historique. Elles sont
        # statiques/verrouillées : présentes par défaut → comportement inchangé.
        codes_actifs = {r['code'] for r in self.regles}
        for code in ORDRE_CONTRAINTES_STATIQUES:
            if code in codes_actifs and code in REGISTRE_CONTRAINTES:
                REGISTRE_CONTRAINTES[code](ctx)

        # ── Contraintes DYNAMIQUES paramétrées (composées par le super-admin) ─
        for r in self.regles:
            template = r.get('template')
            if not template:
                continue
            spec = REGISTRE_TEMPLATES.get(template)
            if spec is None:
                continue  # template inconnu → ignoré silencieusement (déjà validé en amont)
            params = valider_parametres(template, r.get('parametres'))
            spec['builder'](ctx, params)

        # ── Objectif lexicographique ─────────────────────────────────────────
        self._construire_objectif(ctx)

    # ── Contexte + agrégats pré-calculés ────────────────────────────────────
    def _construire_contexte(self) -> SolverContext:
        """Assemble le SolverContext partagé par les builders et l'objectif."""
        n = len(self.demandes)
        cap_max = max((s.capacite for s in self.salles), default=1)
        eff_max = max((self._effectif(d) for d in self.demandes), default=1)

        nb_dem_fil: dict[int, int] = defaultdict(int)
        for d in self.demandes:
            nb_dem_fil[d.filiere_id] += 1
        max_dem = max(nb_dem_fil.values(), default=1)

        # Borne du terme capacité (identique à l'historique) : sert au calage
        # des poids lexicographiques.
        cap_borne = FACTEUR_SURCHARGE * (cap_max + eff_max) + 1

        return SolverContext(
            model=self.model,
            demandes=self.demandes,
            salles=self.salles,
            x=self.x,
            placee=self.placee,
            n=n,
            cap_max=cap_max,
            eff_max=eff_max,
            max_dem=max_dem,
            cap_borne=cap_borne,
            nb_dem_fil=nb_dem_fil,
        )

    # ── Objectif (cascade lexicographique, poids dérivé des bornes) ─────────
    def _construire_objectif(self, ctx: SolverContext):
        """
        Construit l'objectif à partir des fonctions objectif ACTIVES, triées par
        priorité (1 = plus prioritaire). Les poids sont dérivés bottom-up des
        bornes de chaque terme pour garantir un ordre LEXICOGRAPHIQUE strict :
        un gain d'un niveau prime toujours sur tout gain d'un niveau inférieur.

        La cascade reproduit EXACTEMENT les poids historiques lorsque les 5
        objectifs par défaut sont actifs dans l'ordre 1→5 (cf. test « golden »).
        """
        if ctx.n == 0:
            return

        # Du moins prioritaire (traité en premier, poids le plus faible) au plus
        # prioritaire. `running_total` = somme des contributions maximales des
        # niveaux déjà posés → le poids du niveau courant les domine toutes.
        objs = sorted(self.objectifs, key=lambda o: o.get('priorite', 1), reverse=True)
        running_total = 0
        for o in objs:
            handler = resoudre_handler_objectif(o)
            if handler is None:
                continue
            w = running_total + 1
            unites_max = handler(ctx, w, o.get('parametres') or {})
            running_total += w * unites_max

        self.model.Maximize(sum(ctx.termes))

    # ── Étape 3 : lancer la résolution ──────────────────────────────────────
    def solve(self, time_limit_sec: float = 30.0) -> ResultatPlanification:
        """Construit, résout et retourne le résultat."""
        debut = time.perf_counter()

        self._calculer_candidates()
        self._construire_modele()

        self.solver.parameters.max_time_in_seconds = float(time_limit_sec)
        # Reproductibilité : seed fixe pour que deux runs identiques donnent
        # le même résultat (utile pour les tests et le debug).
        self.solver.parameters.random_seed = 42
        self.solver.parameters.num_search_workers = 4  # parallélisme léger

        status = self.solver.Solve(self.model)
        duree_ms = int((time.perf_counter() - debut) * 1000)

        if status == cp_model.OPTIMAL:
            statut_label = 'OPTIMAL'
        elif status == cp_model.FEASIBLE:
            statut_label = 'FEASIBLE'
        elif status == cp_model.INFEASIBLE:
            statut_label = 'INFEASIBLE'
        else:
            statut_label = 'INTERROMPU'

        # Lecture des résultats
        placements: list[Placement]   = []
        non_places: list[NonPlacement] = []

        for d_idx, d in enumerate(self.demandes):
            assigne_a: Optional[int] = None
            if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
                for s_idx in self.salles_candidates[d_idx]:
                    if self.solver.Value(self.x[(d_idx, s_idx)]) == 1:
                        assigne_a = s_idx
                        break

            if assigne_a is not None:
                placements.append(Placement(
                    demande_id=d.id,
                    salle_id=self.salles[assigne_a].id,
                ))
            else:
                raisons = list(self._raisons_pre.get(d_idx, []))
                if not raisons:
                    raisons.append(
                        "Aucune combinaison salle/créneau n'a pu être trouvée "
                        "sans casser les contraintes des autres cours. Essayez "
                        "de décaler le jour ou le créneau."
                    )
                non_places.append(NonPlacement(demande_id=d.id, raisons=raisons))

        # ── Assistant de résolution : suggestions concrètes par cours non placé.
        # On ne suggère des créneaux alternatifs que si un placement partiel
        # existe (sinon l'occupation est vide et les conseils seraient trompeurs).
        if non_places and status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            suggestions = calculer_suggestions(
                self.demandes, self.salles, self.salles_candidates,
                placements, {np.demande_id for np in non_places},
                indispos=self.indispos,
            )
            for np in non_places:
                np.suggestions = suggestions.get(np.demande_id, [])

        return ResultatPlanification(
            placements   = placements,
            non_places   = non_places,
            duree_ms     = duree_ms,
            statut       = statut_label,
            nb_demandes  = len(self.demandes),
            nb_salles    = len(self.salles),
        )
