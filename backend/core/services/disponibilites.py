"""
Résolution des indisponibilités enseignants pour une semaine donnée.

`creneaux_bloques(semaine)` renvoie l'ensemble concret des triplets
(enseignant_id, jour, creneau) où un enseignant ne peut PAS être placé cette
semaine — en combinant les indisponibilités récurrentes et ponctuelles, et en
développant « créneau null = toute la journée » sur les 4 créneaux.
"""

from __future__ import annotations

from django.db.models import Q

from core.constants import Creneau
from core.models import IndisponibiliteEnseignant

_CRENEAUX = [c.value for c in Creneau]


def creneaux_bloques(semaine) -> set[tuple[int, int, int]]:
    qs = IndisponibiliteEnseignant.objects.filter(
        Q(type=IndisponibiliteEnseignant.Type.RECURRENTE)
        | Q(type=IndisponibiliteEnseignant.Type.PONCTUELLE, semaine=semaine)
    ).values('enseignant_id', 'jour', 'creneau')

    bloque: set[tuple[int, int, int]] = set()
    for ind in qs:
        creneaux = [ind['creneau']] if ind['creneau'] is not None else _CRENEAUX
        for c in creneaux:
            bloque.add((ind['enseignant_id'], ind['jour'], c))
    return bloque
