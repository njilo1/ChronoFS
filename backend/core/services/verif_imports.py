"""
Vérification intelligente des imports — couche d'AVERTISSEMENTS (non bloquants)
au-dessus du parsing.

Le parsing rejette déjà les erreurs de format et les conflits INTRA-fichier
(même classe ou même enseignant deux fois au même créneau). Ce module ajoute
ce qui n'est visible qu'à la génération : les conflits INTER-départements —
un enseignant partagé déjà programmé au même créneau par un autre département
ayant déjà déposé pour la même semaine.

Ce sont des avertissements : le chef voit, décide, corrige. Rien n'est bloqué.
"""

from __future__ import annotations

from core.constants import Creneau, Jour
from core.models import DemandeCours, Enseignant
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


def analyser_avertissements(rapport, dept, semaine) -> list[dict]:
    """
    Retourne une liste d'avertissements (non bloquants) [{ligne, message}] :
    1. indisponibilité de l'enseignant au créneau saisi ;
    2. conflit inter-départements (enseignant partagé déjà programmé au même
       créneau par un autre département déjà déposé cette semaine).
    """
    lignes = [l for l in rapport.lignes_valides if l.enseignant_id and l.jour is not None]
    if not lignes:
        return []

    noms_ens = {
        e.id: f'{e.get_grade_display()} {e.nom}'
        for e in Enseignant.objects.filter(id__in={l.enseignant_id for l in lignes})
    }

    # 1) Indisponibilités enseignants pour cette semaine.
    bloque = creneaux_bloques(semaine)

    # 2) Occupation enseignant des AUTRES départements déjà déposés.
    autres = (
        DemandeCours.objects
        .filter(import_source__semaine=semaine, enseignant_id__isnull=False)
        .exclude(import_source__departement=dept)
        .values('enseignant_id', 'jour', 'creneau', 'import_source__departement__nom')
    )
    occ = {}  # (enseignant_id, jour, creneau) -> nom du département
    for d in autres:
        occ.setdefault(
            (d['enseignant_id'], d['jour'], d['creneau']),
            d['import_source__departement__nom'],
        )

    avertissements = []
    for l in lignes:
        cle = (l.enseignant_id, l.jour, l.creneau)
        nom = noms_ens.get(l.enseignant_id, 'Cet enseignant')

        if cle in bloque:
            avertissements.append({
                'ligne': l.ligne_num,
                'message': (
                    f"{nom} est indisponible {_label_jour(l.jour)} "
                    f"{_label_creneau(l.creneau)} — ce cours risque de ne pas être tenu."
                ),
            })

        dept_autre = occ.get(cle)
        if dept_autre:
            avertissements.append({
                'ligne': l.ligne_num,
                'message': (
                    f"{nom} est déjà programmé {_label_jour(l.jour)} "
                    f"{_label_creneau(l.creneau)} par le département « {dept_autre} ». "
                    "Risque de conflit à la génération."
                ),
            })
    return avertissements
