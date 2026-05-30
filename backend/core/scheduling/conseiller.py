"""
Assistant de résolution — suggestions pour les cours non placés.

Pour chaque DemandeCours que le solver n'a pas pu placer, propose des
créneaux alternatifs où le cours TIENDRAIT (salle compatible libre +
enseignant libre + classe libre), à partir du placement final.

C'est un CONSEIL : rien n'est appliqué automatiquement, l'humain décide.
Les suggestions respectent les contraintes structurelles déjà actées par
le placement (H8 : une ville/enseignant/jour, H9 : un campus/filière/semaine)
pour ne jamais proposer un déplacement incohérent.
"""

from __future__ import annotations

from core.constants import Creneau, Jour


def _label_jour(j) -> str:
    try:
        return Jour(j).label
    except ValueError:
        return str(j)


def _label_creneau(c) -> str:
    try:
        return Creneau(c).label
    except ValueError:
        return str(c)


def calculer_suggestions(
    demandes, salles, salles_candidates, placements, non_places_ids, max_sugg=3,
    indispos=None,
):
    """
    Retourne {demande_id: [phrases de suggestion]}.

    - demandes          : list[DemandeCours]  (index = d_idx)
    - salles            : list[Salle]         (index = s_idx)
    - salles_candidates : list[list[int]]     — indices de salles compatibles
      (type / ville / capacité / campus) par d_idx, calculés par le solver.
    - placements        : objets avec .demande_id et .salle_id (placement final).
    - non_places_ids    : ensemble des demande_id à conseiller.
    """
    indispos = set(indispos or ())  # {(enseignant_id, jour, creneau)} interdits
    idx_demande = {d.id: i for i, d in enumerate(demandes)}
    idx_salle   = {s.id: i for i, s in enumerate(salles)}

    # Occupation déduite du placement final.
    occ_salle = set()                 # (s_idx, jour, creneau)
    occ_ens   = set()                 # (enseignant_id, jour, creneau)
    occ_fil   = set()                 # (filiere_id, jour, creneau)
    fil_campus = {}                   # filiere_id -> campus_id déjà utilisé (H9)
    ens_jour_ville = {}               # (enseignant_id, jour) -> ville (H8)

    for p in placements:
        d = demandes[idx_demande[p.demande_id]]
        s_idx = idx_salle[p.salle_id]
        salle = salles[s_idx]
        occ_salle.add((s_idx, d.jour, d.creneau))
        occ_fil.add((d.filiere_id, d.jour, d.creneau))
        fil_campus.setdefault(d.filiere_id, salle.campus_id)
        if d.enseignant_id is not None:
            occ_ens.add((d.enseignant_id, d.jour, d.creneau))
            ens_jour_ville.setdefault((d.enseignant_id, d.jour), salle.campus.ville)

    jours    = [j.value for j in Jour]
    creneaux = [c.value for c in Creneau]

    resultat = {}
    for did in non_places_ids:
        d_idx = idx_demande.get(did)
        if d_idx is None:
            continue
        d = demandes[d_idx]
        cand = salles_candidates[d_idx]

        # Aucune salle ne convient, quel que soit le créneau → problème structurel.
        if not cand:
            resultat[did] = [{
                'label': "Aucune salle ne convient pour ce cours quel que soit le "
                         "créneau (type de cours ou effectif). Vérifiez le type de "
                         "cours, réduisez l'effectif ou scindez la classe.",
            }]
            continue

        suggestions = []
        for j in jours:
            for c in creneaux:
                if j == d.jour and c == d.creneau:
                    continue  # le créneau d'origine est précisément celui qui a échoué
                # L'enseignant ne doit pas être indisponible à ce créneau.
                if d.enseignant_id is not None and (d.enseignant_id, j, c) in indispos:
                    continue
                # La classe doit être libre à ce créneau.
                if (d.filiere_id, j, c) in occ_fil:
                    continue
                # L'enseignant doit être libre à ce créneau.
                if d.enseignant_id is not None and (d.enseignant_id, j, c) in occ_ens:
                    continue
                # H8 : si l'enseignant a déjà une ville ce jour-là, on s'y tient.
                ville_jour = ens_jour_ville.get((d.enseignant_id, j)) if d.enseignant_id else None
                # H9 : si la classe a déjà un campus pour la semaine, on s'y tient.
                campus_fil = fil_campus.get(d.filiere_id)

                salle_libre = None
                for s_idx in cand:
                    if (s_idx, j, c) in occ_salle:
                        continue
                    salle = salles[s_idx]
                    if campus_fil is not None and salle.campus_id != campus_fil:
                        continue
                    if ville_jour is not None and salle.campus.ville != ville_jour:
                        continue
                    salle_libre = salle
                    break

                if salle_libre is None:
                    continue

                # Suggestion ACTIONNABLE : porte les données pour le bouton « Appliquer ».
                suggestions.append({
                    'label':    f"Déplacer à {_label_jour(j)} {_label_creneau(c)} "
                                f"(salle {salle_libre.nom} libre).",
                    'jour':     j,
                    'creneau':  c,
                    'salle_id': salle_libre.id,
                })
                if len(suggestions) >= max_sugg:
                    break
            if len(suggestions) >= max_sugg:
                break

        if not suggestions:
            suggestions.append({
                'label': "Aucun créneau alternatif n'est libre cette semaine : il "
                         "faudra libérer une salle ou retirer un autre cours concurrent.",
            })
        resultat[did] = suggestions

    return resultat


def calculer_recuperables(semaine, max_sugg=3):
    """
    Récupération des créneaux libérés (Phase D).

    Renvoie la liste des cours actuellement NON placés (DemandeCours sans
    Seance) qui pourraient l'être MAINTENANT dans l'espace libre du planning
    (ex. créneau libéré par une absence) — VACATAIRES en premier.

    Chaque entrée : {demande_id, ue, intitule, classe, enseignant, type_cours,
    jour, creneau, vacataire, suggestions:[{label, jour, creneau, salle_id}]}.
    Seuls les cours ayant au moins une suggestion actionnable sont renvoyés.
    """
    # Imports locaux : évite un import circulaire (solver importe ce module).
    from core.constants import StatutEnseignant
    from core.models import DemandeCours, Salle, Seance
    from core.scheduling.solver import PlanningSolver
    from core.services.disponibilites import creneaux_bloques

    demandes = list(
        DemandeCours.objects
        .filter(import_source__semaine=semaine)
        .select_related('filiere__campus_obligatoire', 'ue', 'enseignant')
    )
    if not demandes:
        return []

    placed_ids = set(
        Seance.objects
        .filter(semaine=semaine, demande_origine__isnull=False)
        .values_list('demande_origine_id', flat=True)
    )
    non_places = [d for d in demandes if d.id not in placed_ids]
    if not non_places:
        return []

    salles = list(Salle.objects.filter(disponible=True).select_related('campus'))
    bloque = creneaux_bloques(semaine)

    # Candidats par demande (réutilise H5/H6/H7/H7bis du solver).
    solver = PlanningSolver(demandes, salles, indispos=bloque)
    solver._calculer_candidates()
    cand_by_id = {d.id: solver.salles_candidates[i] for i, d in enumerate(demandes)}

    # Occupation ACTUELLE déduite des Seances réelles en base.
    idx_salle = {s.id: i for i, s in enumerate(salles)}
    occ_salle, occ_ens, occ_fil = set(), set(), set()
    fil_campus, ens_jour_ville = {}, {}
    for s in Seance.objects.filter(semaine=semaine).select_related('salle__campus'):
        si = idx_salle.get(s.salle_id)
        if si is not None:
            occ_salle.add((si, s.jour, s.creneau))
        occ_fil.add((s.filiere_id, s.jour, s.creneau))
        if s.salle_id is not None:
            fil_campus.setdefault(s.filiere_id, s.salle.campus_id)
        if s.enseignant_id is not None:
            occ_ens.add((s.enseignant_id, s.jour, s.creneau))
            ens_jour_ville.setdefault((s.enseignant_id, s.jour), s.salle.campus.ville)

    jours    = [j.value for j in Jour]
    creneaux = [c.value for c in Creneau]

    def _vac(d):
        return bool(d.enseignant and d.enseignant.statut == StatutEnseignant.VACATAIRE)

    # Vacataires d'abord (objectif n°2 du solver), puis ordre stable.
    non_places.sort(key=lambda d: (0 if _vac(d) else 1, d.id))

    resultat = []
    for d in non_places:
        cand = cand_by_id.get(d.id, [])
        if not cand:
            continue
        # Le créneau d'ORIGINE est tenté en premier (souvent libéré désormais).
        ordre = [(d.jour, d.creneau)] + [
            (j, c) for j in jours for c in creneaux if not (j == d.jour and c == d.creneau)
        ]
        suggestions = []
        for (j, c) in ordre:
            if d.enseignant_id is not None and (d.enseignant_id, j, c) in bloque:
                continue
            if (d.filiere_id, j, c) in occ_fil:
                continue
            if d.enseignant_id is not None and (d.enseignant_id, j, c) in occ_ens:
                continue
            ville_jour = ens_jour_ville.get((d.enseignant_id, j)) if d.enseignant_id else None
            campus_fil = fil_campus.get(d.filiere_id)
            salle_libre = None
            for si in cand:
                if (si, j, c) in occ_salle:
                    continue
                sa = salles[si]
                if campus_fil is not None and sa.campus_id != campus_fil:
                    continue
                if ville_jour is not None and sa.campus.ville != ville_jour:
                    continue
                salle_libre = sa
                break
            if salle_libre is None:
                continue
            suggestions.append({
                'label':    f"Placer {_label_jour(j)} {_label_creneau(c)} "
                            f"(salle {salle_libre.nom}).",
                'jour':     j,
                'creneau':  c,
                'salle_id': salle_libre.id,
            })
            if len(suggestions) >= max_sugg:
                break

        if not suggestions:
            continue

        resultat.append({
            'demande_id': d.id,
            'ue':         getattr(d.ue, 'code', None) or '—',
            'intitule':   getattr(d.ue, 'intitule', '') or '',
            'classe':     getattr(d.filiere, 'nom', None) or getattr(d.filiere, 'code', '—'),
            'enseignant': getattr(d.enseignant, 'nom', None) or '—',
            'type_cours': d.type_cours,
            'jour':       _label_jour(d.jour),
            'creneau':    _label_creneau(d.creneau),
            'vacataire':  _vac(d),
            'suggestions': suggestions,
        })
    return resultat
