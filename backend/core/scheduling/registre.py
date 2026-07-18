"""
Registre de configuration du solver FSChrono.

Objectif : rendre les règles (contraintes) et les fonctions objectif du solver
PILOTABLES par le super-administrateur, sans jamais exécuter de code saisi par
l'utilisateur. Chaque entrée de configuration (`RegleSolver`, `FonctionObjectif`)
porte un `code`/`template` qui pointe vers un *handler Python* défini ici.

Trois registres :
- `REGISTRE_CONTRAINTES`   : contraintes dures « model-stage » historiques
                            (H2, H3, H4, H8, H9). H1 est structurel et H5/H6/H7
                            vivent dans le pré-filtrage des salles (perf) : ces
                            quatre-là restent TOUJOURS appliquées par le solver.
- `REGISTRE_TEMPLATES`     : catalogue de contraintes DYNAMIQUES paramétrées que
                            le super-admin compose via l'interface. Chaque
                            template = un schéma de paramètres + un builder
                            CP-SAT. Extension = ajouter une entrée ici.
- `REGISTRE_OBJECTIFS`     : termes de l'objectif lexicographique. Le poids `w`
                            est DÉRIVÉ des bornes (cascade), jamais stocké.

⚠️ `parametres` ne contient que des VALEURS (entiers, codes) validées par le
schéma du template. Aucun `eval`/`exec`, aucune expression arbitraire.

Le solver appelle ces handlers avec un `SolverContext` (cf. dataclass ci-dessous)
qui expose le modèle CP-SAT, les variables `x[(d_idx, s_idx)]`, les expressions
`placee[d_idx]` et les agrégats pré-calculés.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from typing import Callable

from ortools.sat.python import cp_model

from core.constants import (
    Creneau,
    Jour,
    StatutEnseignant,
    TypeSalle,
)

# Types de salle à capacité « illimitée » (terrain) — dupliqué depuis solver.py
# pour éviter une dépendance circulaire ; toute évolution doit rester alignée.
CAPACITE_ILLIMITEE_TYPES = {TypeSalle.TERRAIN}
FACTEUR_SURCHARGE = 3


# ═════════════════════════════════════════════════════════════════════════════
# Contexte partagé passé à tous les builders
# ═════════════════════════════════════════════════════════════════════════════
@dataclass
class SolverContext:
    """Tout ce dont un builder (contrainte / objectif) a besoin."""

    model:  cp_model.CpModel
    demandes: list
    salles:   list
    # x[(d_idx, s_idx)] = BoolVar (uniquement pour les paires candidates)
    x:      dict
    # placee[d_idx] = expression bornée à 1 (nombre de salles attribuées)
    placee: dict

    # Agrégats pré-calculés (renseignés par le solver avant l'objectif).
    n:          int = 0
    cap_max:    int = 1
    eff_max:    int = 1
    max_dem:    int = 1
    cap_borne:  int = 1
    nb_dem_fil: dict = field(default_factory=dict)

    # Termes de l'objectif accumulés par les handlers.
    termes: list = field(default_factory=list)


# ── Helpers métier (identiques au solver historique) ─────────────────────────
def effectif_demande(d) -> int:
    """Effectif retenu pour une demande (déclaré > filière > 1)."""
    return max(1, d.effectif_declare or d.filiere.effectif or 1)


def est_statut(d, statut) -> bool:
    return bool(d.enseignant and d.enseignant.statut == statut)


# ═════════════════════════════════════════════════════════════════════════════
# 1) Contraintes dures historiques « model-stage » (H2, H3, H4, H8, H9)
#    Code IDENTIQUE à l'ancien _construire_modele — aucun changement de logique.
# ═════════════════════════════════════════════════════════════════════════════
def contrainte_h2(ctx: SolverContext) -> None:
    """H2 — ≤ 1 cours par (salle, jour, créneau). Le TERRAIN est exclu (partage)."""
    salle_creneau_vars: dict[tuple[int, int, int], list] = defaultdict(list)
    for (d_idx, s_idx), var in ctx.x.items():
        if ctx.salles[s_idx].type_salle == TypeSalle.TERRAIN:
            continue
        d = ctx.demandes[d_idx]
        salle_creneau_vars[(s_idx, d.jour, d.creneau)].append(var)
    for vars_groupe in salle_creneau_vars.values():
        if len(vars_groupe) > 1:
            ctx.model.Add(sum(vars_groupe) <= 1)


def contrainte_h3(ctx: SolverContext) -> None:
    """H3 — ≤ 1 cours par (enseignant, jour, créneau)."""
    enseignant_creneau: dict[tuple[int, int, int], list[int]] = defaultdict(list)
    for d_idx, d in enumerate(ctx.demandes):
        if d.enseignant_id is not None:
            enseignant_creneau[(d.enseignant_id, d.jour, d.creneau)].append(d_idx)
    for d_indices in enseignant_creneau.values():
        if len(d_indices) > 1:
            ctx.model.Add(sum(ctx.placee[i] for i in d_indices) <= 1)


def contrainte_h4(ctx: SolverContext) -> None:
    """H4 — ≤ 1 cours par (filière, jour, créneau)."""
    filiere_creneau: dict[tuple[int, int, int], list[int]] = defaultdict(list)
    for d_idx, d in enumerate(ctx.demandes):
        filiere_creneau[(d.filiere_id, d.jour, d.creneau)].append(d_idx)
    for d_indices in filiere_creneau.values():
        if len(d_indices) > 1:
            ctx.model.Add(sum(ctx.placee[i] for i in d_indices) <= 1)


def contrainte_h8(ctx: SolverContext) -> None:
    """H8 — un enseignant n'enseigne que dans UNE ville par jour."""
    ej_villes: dict[tuple[int, int], set[str]] = defaultdict(set)
    for (d_idx, s_idx) in ctx.x:
        d = ctx.demandes[d_idx]
        if d.enseignant_id is not None:
            ej_villes[(d.enseignant_id, d.jour)].add(ctx.salles[s_idx].campus.ville)

    bv: dict[tuple[int, int, str], cp_model.IntVar] = {}
    for (e_id, jour), villes in ej_villes.items():
        if len(villes) <= 1:
            continue
        for v in villes:
            bv[(e_id, jour, v)] = ctx.model.NewBoolVar(f'bv_e{e_id}_j{jour}_{v}')
        ctx.model.Add(sum(bv[(e_id, jour, v)] for v in villes) <= 1)

    for (d_idx, s_idx), var in ctx.x.items():
        d = ctx.demandes[d_idx]
        if d.enseignant_id is None:
            continue
        key = (d.enseignant_id, d.jour, ctx.salles[s_idx].campus.ville)
        if key in bv:
            ctx.model.Add(var <= bv[key])


def contrainte_h9(ctx: SolverContext) -> None:
    """H9 — une filière sur UN SEUL campus pour toute la semaine."""
    fil_campus: dict[int, set[int]] = defaultdict(set)
    for (d_idx, s_idx) in ctx.x:
        f_id = ctx.demandes[d_idx].filiere_id
        fil_campus[f_id].add(ctx.salles[s_idx].campus_id)

    bc: dict[tuple[int, int], cp_model.IntVar] = {}
    for f_id, campus_ids in fil_campus.items():
        if len(campus_ids) <= 1:
            continue
        for c_id in campus_ids:
            bc[(f_id, c_id)] = ctx.model.NewBoolVar(f'bc_f{f_id}_c{c_id}')
        ctx.model.Add(sum(bc[(f_id, c_id)] for c_id in campus_ids) <= 1)

    for (d_idx, s_idx), var in ctx.x.items():
        f_id = ctx.demandes[d_idx].filiere_id
        c_id = ctx.salles[s_idx].campus_id
        if (f_id, c_id) in bc:
            ctx.model.Add(var <= bc[(f_id, c_id)])


# Contraintes « model-stage » togglables par code. H1 (structurel), H5/H6/H7
# (pré-filtrage) restent hors registre : toujours appliquées par le solver.
REGISTRE_CONTRAINTES: dict[str, Callable[[SolverContext], None]] = {
    'H2': contrainte_h2,
    'H3': contrainte_h3,
    'H4': contrainte_h4,
    'H8': contrainte_h8,
    'H9': contrainte_h9,
}
# Ordre d'application déterministe (identique à l'historique).
ORDRE_CONTRAINTES_STATIQUES = ('H2', 'H3', 'H4', 'H8', 'H9')


# ═════════════════════════════════════════════════════════════════════════════
# 2) Templates de contraintes DYNAMIQUES (composées par le super-admin)
# ═════════════════════════════════════════════════════════════════════════════
def _demandes_ciblees(ctx, portee, cible):
    """Indices de demandes concernées par une portée (GLOBAL/DEPARTEMENT/FILIERE)."""
    for d_idx, d in enumerate(ctx.demandes):
        if portee == 'DEPARTEMENT' and d.filiere.departement.code != cible:
            continue
        if portee == 'FILIERE' and str(d.filiere_id) != str(cible):
            continue
        yield d_idx, d


def tpl_max_cours_enseignant_creneau(ctx: SolverContext, params: dict) -> None:
    """Un enseignant ne peut donner plus de `max` cours par créneau (généralise H3)."""
    maxi = int(params['max'])
    groupes: dict[tuple[int, int, int], list[int]] = defaultdict(list)
    for d_idx, d in enumerate(ctx.demandes):
        if d.enseignant_id is not None:
            groupes[(d.enseignant_id, d.jour, d.creneau)].append(d_idx)
    for d_indices in groupes.values():
        if len(d_indices) > maxi:
            ctx.model.Add(sum(ctx.placee[i] for i in d_indices) <= maxi)


def tpl_max_cours_jour_filiere(ctx: SolverContext, params: dict) -> None:
    """Une filière ne peut avoir plus de `max` cours par jour."""
    maxi = int(params['max'])
    groupes: dict[tuple[int, int], list[int]] = defaultdict(list)
    for d_idx, d in enumerate(ctx.demandes):
        groupes[(d.filiere_id, d.jour)].append(d_idx)
    for d_indices in groupes.values():
        if len(d_indices) > maxi:
            ctx.model.Add(sum(ctx.placee[i] for i in d_indices) <= maxi)


def tpl_interdire_jour(ctx: SolverContext, params: dict) -> None:
    """Aucun cours ne peut être placé le jour indiqué (portée optionnelle)."""
    jour = int(params['jour'])
    portee = params.get('portee', 'GLOBAL')
    cible  = params.get('cible')
    for d_idx, d in _demandes_ciblees(ctx, portee, cible):
        if d.jour == jour:
            ctx.model.Add(ctx.placee[d_idx] == 0)


def tpl_interdire_creneau(ctx: SolverContext, params: dict) -> None:
    """Aucun cours ne peut être placé sur le créneau indiqué (portée optionnelle)."""
    creneau = int(params['creneau'])
    portee  = params.get('portee', 'GLOBAL')
    cible   = params.get('cible')
    for d_idx, d in _demandes_ciblees(ctx, portee, cible):
        if d.creneau == creneau:
            ctx.model.Add(ctx.placee[d_idx] == 0)


def tpl_reserver_type_salle_departement(ctx: SolverContext, params: dict) -> None:
    """Les salles d'un type donné sont réservées à un département (généralise SBAA)."""
    type_salle = params['type_salle']
    code_dept  = params['code_departement']
    for (d_idx, s_idx), var in ctx.x.items():
        if ctx.salles[s_idx].type_salle != type_salle:
            continue
        if ctx.demandes[d_idx].filiere.departement.code != code_dept:
            ctx.model.Add(var == 0)


# Catalogue : builder + schéma de paramètres (le schéma sert AUSSI au frontend
# pour générer dynamiquement le formulaire de création d'une règle).
REGISTRE_TEMPLATES: dict[str, dict] = {
    'MAX_COURS_ENSEIGNANT_CRENEAU': {
        'builder': tpl_max_cours_enseignant_creneau,
        'label': 'Nombre max de cours par enseignant et par créneau',
        'description': "Limite le nombre de cours qu'un même enseignant peut "
                       "donner sur un même créneau (1 = généralise la règle H3).",
        'type_regle': 'DURE',
        'champs': [
            {'nom': 'max', 'label': 'Maximum', 'type': 'int', 'min': 1, 'defaut': 1},
        ],
    },
    'MAX_COURS_JOUR_FILIERE': {
        'builder': tpl_max_cours_jour_filiere,
        'label': 'Nombre max de cours par filière et par jour',
        'description': "Plafonne le nombre de cours qu'une filière peut avoir "
                       "sur une même journée.",
        'type_regle': 'DURE',
        'champs': [
            {'nom': 'max', 'label': 'Maximum', 'type': 'int', 'min': 1, 'defaut': 4},
        ],
    },
    'INTERDIRE_JOUR': {
        'builder': tpl_interdire_jour,
        'label': 'Interdire un jour',
        'description': "Empêche tout placement de cours le jour choisi.",
        'type_regle': 'DURE',
        'champs': [
            {'nom': 'jour', 'label': 'Jour', 'type': 'choice',
             'choix': [{'value': j.value, 'label': j.label} for j in Jour]},
        ],
    },
    'INTERDIRE_CRENEAU': {
        'builder': tpl_interdire_creneau,
        'label': 'Interdire un créneau',
        'description': "Empêche tout placement de cours sur le créneau choisi.",
        'type_regle': 'DURE',
        'champs': [
            {'nom': 'creneau', 'label': 'Créneau', 'type': 'choice',
             'choix': [{'value': c.value, 'label': c.label} for c in Creneau]},
        ],
    },
    'RESERVER_TYPE_SALLE_DEPARTEMENT': {
        'builder': tpl_reserver_type_salle_departement,
        'label': 'Réserver un type de salle à un département',
        'description': "Un type de salle donné ne peut être utilisé que par les "
                       "cours du département indiqué (généralise terrain/labo SBAA).",
        'type_regle': 'DURE',
        'champs': [
            {'nom': 'type_salle', 'label': 'Type de salle', 'type': 'choice',
             'choix': [{'value': t.value, 'label': t.label} for t in TypeSalle]},
            {'nom': 'code_departement', 'label': 'Code du département', 'type': 'text'},
        ],
    },
}


def catalogue_templates() -> list[dict]:
    """Liste sérialisable des templates (sans les builders) pour l'API/frontend."""
    return [
        {
            'template': nom,
            'label': spec['label'],
            'description': spec['description'],
            'type_regle': spec['type_regle'],
            'champs': spec['champs'],
        }
        for nom, spec in REGISTRE_TEMPLATES.items()
    ]


def valider_parametres(template: str, params: dict | None) -> dict:
    """
    Valide et normalise les paramètres d'une règle dynamique selon le schéma de
    son template. Lève `ValueError` (message lisible) en cas d'anomalie —
    appelée par le serializer (à l'enregistrement) ET par le solver (défensif).
    """
    spec = REGISTRE_TEMPLATES.get(template)
    if spec is None:
        raise ValueError(f"Template de règle inconnu : « {template} ».")
    params = params or {}
    nettoye: dict = {}
    for champ in spec['champs']:
        nom = champ['nom']
        val = params.get(nom, champ.get('defaut'))
        if val is None or val == '':
            raise ValueError(f"Paramètre requis manquant : « {champ['label']} ».")
        t = champ['type']
        if t == 'int':
            try:
                val = int(val)
            except (TypeError, ValueError):
                raise ValueError(f"« {champ['label']} » doit être un entier.")
            if 'min' in champ and val < champ['min']:
                raise ValueError(f"« {champ['label']} » doit être ≥ {champ['min']}.")
        elif t == 'choice':
            autorises = [c['value'] for c in champ['choix']]
            # Les choices numériques (jour/créneau) arrivent parfois en str.
            if val not in autorises:
                try:
                    val = int(val)
                except (TypeError, ValueError):
                    pass
            if val not in autorises:
                raise ValueError(f"Valeur invalide pour « {champ['label']} ».")
        elif t == 'text':
            val = str(val).strip()
            if not val:
                raise ValueError(f"« {champ['label']} » est requis.")
        nettoye[nom] = val
    # Portée optionnelle commune aux templates INTERDIRE_*.
    if 'portee' in params:
        nettoye['portee'] = params['portee']
        if params.get('cible') not in (None, ''):
            nettoye['cible'] = params['cible']
    return nettoye


# ═════════════════════════════════════════════════════════════════════════════
# 3) Fonctions objectif (cascade lexicographique — poids dérivé des bornes)
#    Chaque handler : (ctx, w, params) -> unites_max (contribution max en unités).
#    Reproduit EXACTEMENT les termes de l'ancien _construire_objectif.
# ═════════════════════════════════════════════════════════════════════════════
def obj_max_cours(ctx: SolverContext, w: int, params: dict) -> int:
    """1. Maximiser le nombre de cours placés."""
    for d_idx in range(ctx.n):
        ctx.termes.append(w * ctx.placee[d_idx])
    return ctx.n


def obj_priorite_statut(ctx: SolverContext, w: int, params: dict) -> int:
    """2. Priorité aux enseignants d'un statut donné (par défaut : vacataires)."""
    statut = params.get('statut', StatutEnseignant.VACATAIRE)
    for d_idx, d in enumerate(ctx.demandes):
        if est_statut(d, statut):
            ctx.termes.append(w * ctx.placee[d_idx])
    return ctx.n


def obj_equite(ctx: SolverContext, w: int, params: dict) -> int:
    """3. Équité : à nombre de cours égal, favoriser les filières peu programmées."""
    for d_idx, d in enumerate(ctx.demandes):
        bonus = ctx.max_dem - ctx.nb_dem_fil[d.filiere_id]
        if bonus > 0:
            ctx.termes.append((w * bonus) * ctx.placee[d_idx])
    return ctx.n * ctx.max_dem


def obj_continuite(ctx: SolverContext, w: int, params: dict) -> int:
    """4. Continuité de salle : minimiser le nombre de salles distinctes/filière."""
    fs_vars: dict[tuple[int, int], list] = defaultdict(list)
    for (d_idx, s_idx), var in ctx.x.items():
        fs_vars[(ctx.demandes[d_idx].filiere_id, s_idx)].append(var)
    nb_u = 0
    for key, vars_grp in fs_vars.items():
        u = ctx.model.NewBoolVar(f'u_f{key[0]}_s{key[1]}')
        for v in vars_grp:
            ctx.model.Add(v <= u)
        ctx.termes.append(-w * u)
        nb_u += 1
    return nb_u


def obj_capacite(ctx: SolverContext, w: int, params: dict) -> int:
    """5. Capacité ≈ effectif : minimiser gaspillage et forçage."""
    for (d_idx, s_idx), var in ctx.x.items():
        effectif = effectif_demande(ctx.demandes[d_idx])
        capacite = ctx.salles[s_idx].capacite
        if ctx.salles[s_idx].type_salle in CAPACITE_ILLIMITEE_TYPES:
            cout = 0
        elif capacite >= effectif:
            cout = capacite - effectif
        else:
            cout = (effectif - capacite) * FACTEUR_SURCHARGE
        if cout:
            ctx.termes.append(-(w * cout) * var)
    return ctx.n * ctx.cap_borne


REGISTRE_OBJECTIFS: dict[str, Callable[[SolverContext, int, dict], int]] = {
    'OBJ_MAX_COURS':   obj_max_cours,
    'PRIORITE_STATUT': obj_priorite_statut,
    'OBJ_VACATAIRES':  obj_priorite_statut,   # alias (code historique)
    'OBJ_EQUITE':      obj_equite,
    'OBJ_CONTINUITE':  obj_continuite,
    'OBJ_CAPACITE':    obj_capacite,
}


# ═════════════════════════════════════════════════════════════════════════════
# Configuration PAR DÉFAUT (repli si la BDD n'est pas seedée)
# Reproduit à l'identique les 9 règles + les 5 objectifs historiques.
# ═════════════════════════════════════════════════════════════════════════════
DEFAUT_REGLES: list[dict] = [
    {'code': f'H{i}', 'template': None, 'parametres': {}} for i in range(1, 10)
]

DEFAUT_OBJECTIFS: list[dict] = [
    {'code': 'OBJ_MAX_COURS',  'template': None,              'parametres': {},                      'priorite': 1},
    {'code': 'OBJ_VACATAIRES', 'template': 'PRIORITE_STATUT', 'parametres': {'statut': 'VACATAIRE'}, 'priorite': 2},
    {'code': 'OBJ_EQUITE',     'template': None,              'parametres': {},                      'priorite': 3},
    {'code': 'OBJ_CONTINUITE', 'template': None,              'parametres': {},                      'priorite': 4},
    {'code': 'OBJ_CAPACITE',   'template': None,              'parametres': {},                      'priorite': 5},
]


def resoudre_handler_objectif(entree: dict) -> Callable | None:
    """Handler d'un objectif : `template` prioritaire, sinon `code`."""
    return REGISTRE_OBJECTIFS.get(entree.get('template') or entree.get('code'))
