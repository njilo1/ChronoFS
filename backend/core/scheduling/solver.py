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
    H5  ∀(d, s) : x[d,s] = 0  si capacité_s < effectif_d   (sauf TERRAIN illimité)
    H6  ∀(d, s) : x[d,s] = 0  si type_salle non compatible avec type_cours
    H7  ∀(d, s) : x[d,s] = 0  si ville_filière(d) ≠ ville_campus(s)
    H8  buffer inter-villes — pour chaque paire (d_a, d_b) avec même prof,
        même jour, |créneau_a − créneau_b| ≤ 1, villes différentes :
            placée(d_a) + placée(d_b) ≤ 1

Objectif : max Σ_d (placée(d) × effectif_d).
Les filières à gros effectif sont prioritaires si on doit en sacrifier.

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
    HORAIRES_CRENEAUX,
    Jour,
    SALLES_AUTORISEES_PAR_TYPE_COURS,
    TypeSalle,
)
from core.models import DemandeCours, Salle


# ── Capacité considérée comme infinie ────────────────────────────────────────
# Les terrains acceptent n'importe quelle classe (sport, activités spéciales).
CAPACITE_ILLIMITEE_TYPES = {TypeSalle.TERRAIN}


@dataclass
class Placement:
    """Une demande placée dans une salle (résultat positif)."""

    demande_id: int
    salle_id:   int


@dataclass
class NonPlacement:
    """Une demande NON placée + raisons humainement lisibles."""

    demande_id: int
    raisons:    list[str] = field(default_factory=list)


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

    def __init__(self, demandes: list[DemandeCours], salles: list[Salle]):
        # On matérialise sous forme de listes ordonnées pour pouvoir indexer.
        self.demandes: list[DemandeCours] = list(demandes)
        self.salles:   list[Salle]        = list(salles)

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

        # placee[d_idx] = somme bornée à 1 → réutilisée pour H3/H4/H8 et objectif.
        self.placee: dict[int, cp_model.LinearExpr] = {}

    # ── Étape 1 : pré-filtrer les salles candidates par demande ─────────────
    def _calculer_candidates(self):
        for d_idx, d in enumerate(self.demandes):
            ville_demande = d.filiere.ville
            types_autorises = SALLES_AUTORISEES_PAR_TYPE_COURS.get(d.type_cours, [])
            effectif = max(1, d.effectif_declare or d.filiere.effectif or 1)

            candidates: list[int] = []
            raisons: set[str] = set()

            for s_idx, s in enumerate(self.salles):
                if not s.disponible:
                    continue

                # H7 — Ville stricte
                if s.campus.ville != ville_demande:
                    continue

                # H6 — Type de salle compatible
                if s.type_salle not in types_autorises:
                    continue

                # H5 — Capacité (sauf TERRAIN qui est illimité)
                if s.type_salle not in CAPACITE_ILLIMITEE_TYPES:
                    if s.capacite < effectif:
                        continue

                candidates.append(s_idx)

            if not candidates:
                # Diagnostic pour le rapport
                if not any(s.campus.ville == ville_demande for s in self.salles):
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

        # ── H2 : ≤ 1 cours par (salle, jour, créneau) ────────────────────────
        # Groupement des demandes par (salle, jour, créneau)
        salle_creneau_vars: dict[tuple[int, int, int], list[cp_model.IntVar]] = defaultdict(list)
        for (d_idx, s_idx), var in self.x.items():
            d = self.demandes[d_idx]
            salle_creneau_vars[(s_idx, d.jour, d.creneau)].append(var)
        for vars_groupe in salle_creneau_vars.values():
            if len(vars_groupe) > 1:
                self.model.Add(sum(vars_groupe) <= 1)

        # ── H3 : ≤ 1 cours par (enseignant, jour, créneau) ───────────────────
        # On somme les placee[d_idx] des demandes du même prof au même créneau
        enseignant_creneau: dict[tuple[int, int, int], list[int]] = defaultdict(list)
        for d_idx, d in enumerate(self.demandes):
            if d.enseignant_id is not None:
                enseignant_creneau[(d.enseignant_id, d.jour, d.creneau)].append(d_idx)
        for d_indices in enseignant_creneau.values():
            if len(d_indices) > 1:
                self.model.Add(sum(self.placee[i] for i in d_indices) <= 1)

        # ── H4 : ≤ 1 cours par (filière, jour, créneau) ──────────────────────
        filiere_creneau: dict[tuple[int, int, int], list[int]] = defaultdict(list)
        for d_idx, d in enumerate(self.demandes):
            filiere_creneau[(d.filiere_id, d.jour, d.creneau)].append(d_idx)
        for d_indices in filiere_creneau.values():
            if len(d_indices) > 1:
                self.model.Add(sum(self.placee[i] for i in d_indices) <= 1)

        # ── H8 : buffer inter-villes (≥ 1 créneau d'écart) ───────────────────
        # Pour chaque paire (a, b) d'un même prof, même jour, |c_a − c_b| ≤ 1,
        # villes différentes → max 1 des deux peut être placé.
        # On groupe d'abord par (enseignant_id, jour) pour réduire la
        # combinatoire (sinon O(N²) global).
        ens_jour: dict[tuple[int, int], list[int]] = defaultdict(list)
        for d_idx, d in enumerate(self.demandes):
            if d.enseignant_id is not None:
                ens_jour[(d.enseignant_id, d.jour)].append(d_idx)
        for indices in ens_jour.values():
            if len(indices) < 2:
                continue
            for i in range(len(indices)):
                for j in range(i + 1, len(indices)):
                    a_idx, b_idx = indices[i], indices[j]
                    a, b = self.demandes[a_idx], self.demandes[b_idx]
                    if abs(a.creneau - b.creneau) > 1:
                        continue
                    if a.filiere.ville == b.filiere.ville:
                        continue  # H3 couvre déjà |c|==0, H2 OK sinon
                    # Conflit inter-ville : sacrifice obligatoire d'un des deux
                    self.model.Add(self.placee[a_idx] + self.placee[b_idx] <= 1)

        # ── Objectif : maximiser Σ placée(d) × effectif_d ────────────────────
        objectif = []
        for d_idx, d in enumerate(self.demandes):
            effectif = max(1, d.effectif_declare or d.filiere.effectif or 1)
            objectif.append(self.placee[d_idx] * effectif)
        self.model.Maximize(sum(objectif))

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

        return ResultatPlanification(
            placements   = placements,
            non_places   = non_places,
            duree_ms     = duree_ms,
            statut       = statut_label,
            nb_demandes  = len(self.demandes),
            nb_salles    = len(self.salles),
        )
