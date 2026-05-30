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

from core.constants import Creneau, Jour, StatutSemaine
from core.models import DemandeCours, Salle, Seance, Semaine
from core.scheduling.solver import PlanningSolver, ResultatPlanification
from core.services.disponibilites import creneaux_bloques


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
def generer_planning(semaine: Semaine, time_limit_sec: float = 30.0) -> dict:
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
    resultat: ResultatPlanification = (
        PlanningSolver(demandes, salles, indispos=indispos).solve(time_limit_sec=time_limit_sec)
    )

    # ── 5. Créer les Seance correspondantes ──────────────────────────────────
    # On indexe les demandes par id pour reconstruire chaque Seance.
    demandes_par_id = {d.id: d for d in demandes}

    seances_a_creer = []
    for placement in resultat.placements:
        d = demandes_par_id[placement.demande_id]
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
        ))
    Seance.objects.bulk_create(seances_a_creer)

    # ── 6. Bascule de statut ─────────────────────────────────────────────────
    semaine.statut = StatutSemaine.GENERE
    semaine.save(update_fields=['statut'])

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
