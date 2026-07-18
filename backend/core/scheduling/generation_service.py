"""
Orchestration du solver côté Django.

`generer_planning(semaine)` :
1. Charge toutes les `DemandeCours` rattachées aux `ImportPlanning` actifs
   de la semaine (un par département).
2. Charge toutes les `Salle` disponibles, peu importe la ville (le
   solver filtre par H7 lui-même).
3. Supprime toutes les `Seance` existantes pour cette semaine (régénération
   propre — si le DAR avait modifié manuellement, c'est perdu : ce sera
   géré finement en Phase 7 si nécessaire).
4. Appelle `PlanningSolver` et crée les nouvelles `Seance`.
5. Bascule le statut de la semaine en GENERE.
6. Retourne un résumé pour l'API.
"""

from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from core.constants import Creneau, Jour, StatutSemaine, TypeSalle
from core.models import (
    DemandeCours, FonctionObjectif, JournalGeneration, RegleSolver, Salle,
    Seance, Semaine,
)
from core.scheduling.solver import PlanningSolver, ResultatPlanification
from core.services.disponibilites import creneaux_bloques


def resoudre_config(
    regles_desactivees=None, regles_activees=None,
    objectifs_desactives=None, objectifs_activees=None,
):
    """
    Résout la configuration EFFECTIVE de génération depuis la BDD.

    Règle/objectif ACTIF si : verrouillé (toujours) OU explicitement activé OU
    (actif par défaut ET non explicitement désactivé). Les entrées verrouillées
    sont TOUJOURS incluses — on ignore toute tentative de les retirer.

    Retourne `(regles, objectifs)` — deux listes de dicts prêtes pour le solver,
    ou `None` si la table est vide (le solver retombe alors sur ses défauts).
    """
    des_r = set(regles_desactivees or [])
    act_r = set(regles_activees or [])
    des_o = set(objectifs_desactives or [])
    act_o = set(objectifs_activees or [])

    regles = []
    for r in RegleSolver.objects.all():
        actif = r.verrouillee or (r.code in act_r) or (r.active_par_defaut and r.code not in des_r)
        if actif:
            regles.append({'code': r.code, 'template': r.template, 'parametres': r.parametres})

    objectifs = []
    for o in FonctionObjectif.objects.all():
        actif = o.verrouillee or (o.code in act_o) or (o.active_par_defaut and o.code not in des_o)
        if actif:
            objectifs.append({
                'code': o.code, 'template': o.template,
                'parametres': o.parametres, 'priorite': o.priorite,
            })

    return (regles or None), (objectifs or None)


def _label_jour(j):
    try:
        return Jour(j).label
    except ValueError:
        return str(j)


def _label_creneau(c):
    try:
        return Creneau(c).label
    except ValueError:
        return str(c)


def _decrire_demande(d: DemandeCours) -> dict:
    """Descripteur lisible d'un cours, pour l'Assistant de résolution."""
    return {
        'ue':         getattr(d.ue, 'code', None) or getattr(d.ue, 'intitule', '—'),
        'intitule':   getattr(d.ue, 'intitule', '') or '',
        'classe':     getattr(d.filiere, 'nom', None) or getattr(d.filiere, 'code', '—'),
        'enseignant': getattr(d.enseignant, 'nom', None) or '—',
        'type_cours': d.type_cours,
        'jour':       _label_jour(d.jour),
        'creneau':    _label_creneau(d.creneau),
    }


@transaction.atomic
def generer_planning(
    semaine: Semaine,
    time_limit_sec: float = 30.0,
    regles: list[dict] | None = None,
    objectifs: list[dict] | None = None,
    lancee_par=None,
) -> dict:
    """
    Régénère intégralement le planning d'une semaine.

    Retourne :
        {
            'placees':         int,
            'non_placees':     [{'demande_id', 'raisons': [...]}],
            'duree_ms':        int,
            'statut_solver':   'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE' | 'INTERROMPU',
            'nb_demandes':     int,
            'nb_salles':       int,
            'statut_semaine':  StatutSemaine.GENERE,
        }
    """
    # ── 1. Charger les demandes de tous les imports actifs de la semaine ─────
    demandes = list(
        DemandeCours.objects
        .filter(import_source__semaine=semaine)
        .select_related(
            'filiere__departement', 'filiere__campus_obligatoire',
            'ue', 'enseignant',
        )
    )

    # ── 2. Charger les salles ────────────────────────────────────────────────
    salles = list(
        Salle.objects.filter(disponible=True).select_related('campus')
    )

    # ── 3. Supprimer les anciennes Seance ────────────────────────────────────
    Seance.objects.filter(semaine=semaine).delete()

    # ── 4. Résoudre ──────────────────────────────────────────────────────────
    if not demandes:
        # Cas dégénéré : aucune demande → semaine vide mais marquée GENERE
        semaine.statut = StatutSemaine.GENERE
        semaine.save(update_fields=['statut'])
        JournalGeneration.objects.create(
            semaine=semaine, lancee_par=lancee_par,
            regles_appliquees=[], objectifs_appliques=[],
            nb_demandes=0, nb_placees=0, nb_non_placees=0,
            taux=0.0, duree_ms=0, statut_solver='OPTIMAL',
        )
        return {
            'placees':        0,
            'non_placees':    [],
            'duree_ms':       0,
            'statut_solver':  'OPTIMAL',
            'nb_demandes':    0,
            'nb_salles':      len(salles),
            'statut_semaine': semaine.statut,
        }

    indispos = creneaux_bloques(semaine)
    solver = PlanningSolver(
        demandes, salles, indispos=indispos, regles=regles, objectifs=objectifs,
    )
    resultat: ResultatPlanification = solver.solve(time_limit_sec=time_limit_sec)

    # ── 5. Créer les Seance correspondantes ──────────────────────────────────
    # On indexe les demandes par id pour reconstruire chaque Seance.
    demandes_par_id = {d.id: d for d in demandes}
    # bulk_create ne déclenche pas Seance.save() : on dérive ici le drapeau
    # de partage (terrain) à partir du type de salle attribué.
    salles_par_id = {s.id: s for s in salles}

    seances_a_creer = []
    for placement in resultat.placements:
        d = demandes_par_id[placement.demande_id]
        salle = salles_par_id[placement.salle_id]
        seances_a_creer.append(Seance(
            semaine          = semaine,
            demande_origine  = d,
            filiere          = d.filiere,
            ue               = d.ue,
            enseignant       = d.enseignant,
            salle_id         = placement.salle_id,
            jour             = d.jour,
            creneau          = d.creneau,
            type_cours       = d.type_cours,
            salle_partageable = (salle.type_salle == TypeSalle.TERRAIN),
        ))
    Seance.objects.bulk_create(seances_a_creer)

    # ── 6. Bascule de statut ─────────────────────────────────────────────────
    semaine.statut = StatutSemaine.GENERE
    semaine.save(update_fields=['statut'])

    # ── 7. Journal d'audit (config réellement appliquée + résultat) ──────────
    nb_placees = len(resultat.placements)
    JournalGeneration.objects.create(
        semaine=semaine,
        lancee_par=lancee_par,
        regles_appliquees=[r['code'] for r in solver.regles],
        objectifs_appliques=[o['code'] for o in solver.objectifs],
        nb_demandes=resultat.nb_demandes,
        nb_placees=nb_placees,
        nb_non_placees=len(resultat.non_places),
        taux=round(100 * nb_placees / resultat.nb_demandes, 1) if resultat.nb_demandes else 0.0,
        duree_ms=resultat.duree_ms,
        statut_solver=resultat.statut,
    )

    return {
        'placees':        len(resultat.placements),
        'non_placees':    [
            {
                'demande_id':  np.demande_id,
                **_decrire_demande(demandes_par_id[np.demande_id]),
                'raisons':     np.raisons,
                'suggestions': np.suggestions,
            }
            for np in resultat.non_places
        ],
        'duree_ms':       resultat.duree_ms,
        'statut_solver':  resultat.statut,
        'nb_demandes':    resultat.nb_demandes,
        'nb_salles':      resultat.nb_salles,
        'statut_semaine': semaine.statut,
    }
