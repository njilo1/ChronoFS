"""
Algorithme ChronoFS — Génération automatique d'emplois du temps
═══════════════════════════════════════════════════════════════
Stratégie : Greedy Best-First avec heuristique MRV (Minimum Remaining Values)

Contraintes DURES (jamais violées) :
  H1 — Une salle ne peut accueillir qu'un seul cours par créneau horaire
  H2 — Un enseignant ne peut donner qu'un seul cours par créneau horaire
  H3 — Un groupe d'étudiants (niveau) ne peut assister qu'à un seul cours par créneau
  H4 — Capacité salle ≥ effectif du niveau (tolérance 10%)
  H5 — La salle est dans le même campus que la filière (pas de cours Monatélé dans salle Ebolowa)

Contraintes DOUCES (optimisées par score, score bas = meilleur) :
  S1 — Préférer 10h15 (0) > 13h00 (2) > 07h30 (4) > 15h45 (8)
  S2 — Préférer début de semaine sur fin de semaine
  S3 — Minimiser le gaspillage de salles (surplus // 15 par tranche de 15 places)
  S4 — Éviter prof avec cours 07h30 ET 15h45 le même jour (+100)
  S5 — Éviter prof avec cours 07h30 ET 13h00 le même jour (+40)
  S6 — Éviter deux séances de la même matière le même jour (+150)

Ordre de traitement MRV (les matières les plus contraintes d'abord) :
  1. Effectif décroissant  → grands groupes ont moins de salles candidates
  2. Nb salles croissant   → moins de choix = plus contraint
  3. Code alphabétique     → comportement déterministe
"""

import time
from collections import defaultdict

from django.db import transaction
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from plannings.models import EmploiDuTemps, Creneau
from matieres.models import Matiere
from salles.models import Salle, Campus
from planification.models import SessionPlanification


# ─── Constantes UEB ───────────────────────────────────────────────────────────

JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

PLAGES = [
    ('07:30', '10:00'),
    ('10:15', '12:45'),
    ('13:00', '15:30'),
    ('15:45', '18:15'),
]

# Préférences horaires : score bas = meilleure heure
PREF_HEURE = {'07:30': 4, '10:15': 0, '13:00': 2, '15:45': 8}

# Préférences journalières : score bas = meilleur jour
PREF_JOUR  = {'lundi': 0, 'mardi': 1, 'mercredi': 2, 'jeudi': 3, 'vendredi': 4, 'samedi': 6}

# Une salle peut accueillir jusqu'à 10% de moins que l'effectif officiel
TOLERANCE_CAPACITE = 0.90


# ─── Planificateur ────────────────────────────────────────────────────────────

class ChronoFSScheduler:
    """
    Cœur algorithmique de ChronoFS.

    Usage :
        scheduler = ChronoFSScheduler(edt, filiere_ids, ecraser=False)
        scheduler.run()
        scheduler.sauvegarder()   # si pas dry_run
    """

    def __init__(
        self,
        emploi_du_temps: EmploiDuTemps,
        session: SessionPlanification = None,
        filiere_ids: list = None,
        ecraser: bool = False,
    ):
        self.edt         = emploi_du_temps
        self.session     = session
        self.filiere_ids = filiere_ids or []
        self.ecraser     = ecraser

        # Tables de contraintes : clé = (jour, heure_debut) → ensemble d'IDs occupés
        # Vérification O(1) à chaque tentative de placement
        self._salle_prise:     dict[tuple, set] = defaultdict(set)   # H1
        self._enseignant_pris: dict[tuple, set] = defaultdict(set)   # H2
        self._niveau_pris:     dict[tuple, set] = defaultdict(set)   # H3

        # Suivi pour les contraintes douces
        self._enseignant_heures: dict[int, list] = defaultdict(list)  # ens_id → [(jour, h)]
        self._matiere_jours:     dict[int, list] = defaultdict(list)  # mat_id → [jour, ...]

        # Salles disponibles (chargées dans run())
        self._salles: list = []

        # Résultats
        self.places:     list[dict] = []  # créneaux prêts pour bulk_create
        self._preview:   list[dict] = []  # aperçu lisible (dry_run)
        self.non_places: list[dict] = []  # matières non planifiées + diagnostics

    # ─── Préchargement ────────────────────────────────────────────────────────

    def _charger_salles(self):
        """Charger toutes les salles disponibles, triées par capacité croissante."""
        self._salles = list(
            Salle.objects.filter(est_disponible=True).order_by('capacite')
        )

    def _charger_contraintes_existantes(self):
        """
        Injecter dans les tables les créneaux déjà présents dans cet EDT.
        Si ecraser=True → ignorer les créneaux auto (ils seront régénérés),
                           mais préserver les créneaux placés manuellement.
        """
        qs = Creneau.objects.filter(emploi_du_temps=self.edt)
        if self.ecraser:
            # Garder seulement les créneaux manuels comme contraintes
            qs = qs.filter(genere_auto=False)

        for c in qs.select_related('matiere__enseignant', 'matiere__niveau'):
            k = (c.jour, c.heure_debut)
            self._salle_prise[k].add(c.salle_id)
            if c.matiere.enseignant_id:
                self._enseignant_pris[k].add(c.matiere.enseignant_id)
                self._enseignant_heures[c.matiere.enseignant_id].append(k)
            self._niveau_pris[k].add(c.matiere.niveau_id)
            self._matiere_jours[c.matiere_id].append(c.jour)

    # ─── Sélection de salles ──────────────────────────────────────────────────

    def _salles_candidates(self, effectif: int, campus_id=None) -> list:
        """
        Retourner les salles pouvant accueillir le groupe (avec tolérance 10%).
        Triées par capacité croissante → premier disponible = meilleur fit.
        H5 : si campus_id est fourni, restreindre aux salles du même campus.
        """
        seuil = max(1, int(effectif * TOLERANCE_CAPACITE))
        candidates = [s for s in self._salles if s.capacite >= seuil]
        if campus_id:
            # H5 — Les étudiants ne peuvent pas traverser deux villes différentes
            candidates = [s for s in candidates if s.campus_id == campus_id]
        return candidates

    # ─── Score de qualité ─────────────────────────────────────────────────────

    def _score(self, jour: str, heure: str, salle, matiere: Matiere, effectif: int) -> int:
        """
        Évaluer la qualité d'un créneau (score bas = meilleur choix).
        Combine préférences horaires, charge enseignant, gaspillage de salle.
        """
        score = PREF_HEURE[heure] + PREF_JOUR[jour]

        # S3 — Gaspillage salle : pénalité par tranche de 15 places en surplus
        surplus = max(0, salle.capacite - effectif)
        score += surplus // 15

        if matiere.enseignant_id:
            heures_prof_ce_jour = [
                h for (j, h) in self._enseignant_heures[matiere.enseignant_id]
                if j == jour
            ]
            if heures_prof_ce_jour:
                toutes_heures = set(heures_prof_ce_jour) | {heure}
                if '07:30' in toutes_heures and '15:45' in toutes_heures:
                    score += 100  # S4 — prof écartelé entre matin tôt et fin d'après-midi
                elif '07:30' in toutes_heures and '13:00' in toutes_heures:
                    score += 40   # S5 — gap significatif

        # S6 — Éviter deux séances de la même matière le même jour
        if jour in self._matiere_jours[matiere.id]:
            score += 150

        return score

    # ─── Diagnostic ───────────────────────────────────────────────────────────

    def _diagnostic(self, matiere: Matiere, effectif: int, seances_manquantes: int) -> dict:
        """Analyser pourquoi une matière n'a pas pu être entièrement planifiée."""
        salles_ok = self._salles_candidates(effectif)
        raisons   = []

        if not salles_ok:
            raisons.append(
                f'Aucune salle avec ≥ {int(effectif * TOLERANCE_CAPACITE)} places '
                f'(effectif du groupe : {effectif})'
            )
        else:
            blocage_niveau     = 0
            blocage_enseignant = 0
            blocage_salle      = 0
            slots_libres       = 0

            for jour in JOURS:
                for (heure_debut, _) in PLAGES:
                    k = (jour, heure_debut)
                    if matiere.niveau_id in self._niveau_pris[k]:
                        blocage_niveau += 1
                        continue
                    if matiere.enseignant_id and matiere.enseignant_id in self._enseignant_pris[k]:
                        blocage_enseignant += 1
                        continue
                    if all(s.id in self._salle_prise[k] for s in salles_ok):
                        blocage_salle += 1
                        continue
                    slots_libres += 1

            nb_total = len(JOURS) * len(PLAGES)  # 24

            if blocage_niveau >= nb_total - 2:
                raisons.append(
                    f'Groupe {matiere.niveau} surchargé — '
                    f'{blocage_niveau}/{nb_total} créneaux déjà occupés par ce groupe'
                )
            if matiere.enseignant_id and blocage_enseignant >= 18:
                raisons.append(
                    f'{matiere.enseignant} surchargé(e) — '
                    f'{blocage_enseignant} créneaux bloqués'
                )
            if blocage_salle >= 20:
                raisons.append(
                    f'Toutes les salles ≥ {int(effectif * TOLERANCE_CAPACITE)} places '
                    f'sont saturées sur les créneaux libres'
                )
            if not raisons:
                raisons.append(
                    f'Combinaison de contraintes multiples — '
                    f'seulement {slots_libres}/{nb_total} créneaux libres restants. '
                    f'Réduisez la charge ou ajoutez des salles.'
                )

        return {
            'matiere':            matiere.code,
            'intitule':           matiere.intitule,
            'niveau':             str(matiere.niveau),
            'filiere':            matiere.niveau.filiere.code,
            'enseignant':         str(matiere.enseignant) if matiere.enseignant else '—',
            'effectif':           effectif,
            'seances_manquantes': seances_manquantes,
            'raisons':            raisons,
        }

    # ─── Algorithme principal ─────────────────────────────────────────────────

    def run(self) -> 'ChronoFSScheduler':
        """
        Exécuter l'algorithme de génération.
        Résultats disponibles dans self.places, self._preview et self.non_places.
        """
        self._charger_salles()
        self._charger_contraintes_existantes()

        if not self._salles:
            self.non_places.append({
                'matiere': '—',
                'intitule': 'Aucune salle disponible dans la base de données.',
                'niveau': '—', 'filiere': '—', 'enseignant': '—',
                'effectif': 0, 'seances_manquantes': 0,
                'raisons': ['Créez et activez des salles avant de lancer la génération.'],
            })
            return self

        # ── Charger les matières du périmètre demandé ────────────────────────
        # Priorité au filtre par session (workflow normal). À défaut, fallback
        # sur le filtre par filières (compatibilité avec l'ancien appel).
        qs = Matiere.objects.select_related('niveau__filiere', 'enseignant')
        if self.session:
            qs = qs.filter(session=self.session)
        elif self.filiere_ids:
            qs = qs.filter(niveau__filiere_id__in=self.filiere_ids)
        else:
            return self

        matieres = list(qs)
        if not matieres:
            return self

        # ── Préparer la file de travail ──────────────────────────────────────
        # 1 séance = 1 plage UEB = 2h30
        # volume_horaire 5h → 2 séances, 7.5h → 3 séances, etc.
        work = []
        for m in matieres:
            nb_seances = max(1, round(m.volume_horaire / 2.5))
            effectif   = m.niveau.effectif or m.niveau.filiere.effectif or 30
            # H5 : restreindre les salles candidates au campus de la filière
            campus_id  = m.niveau.filiere.campus_id
            salles_ok  = self._salles_candidates(effectif, campus_id=campus_id)
            work.append((m, nb_seances, effectif, salles_ok))

        # ── Tri MRV statique ─────────────────────────────────────────────────
        # Les matières les plus contraintes sont traitées en premier :
        #   - effectif décroissant  → moins de salles candidates
        #   - nb_salles croissant   → plus contraint
        #   - code alphabétique     → déterminisme
        work.sort(key=lambda x: (-x[2], len(x[3]), x[0].code))

        # ── Placement round-robin par tour ────────────────────────────────────
        # Au lieu de placer toutes les séances d'une matière avant de passer à
        # la suivante, on fait des tours : tour 1 = 1ʳᵉ séance de chaque matière,
        # tour 2 = 2ᵉ séance, etc. Si la capacité est saturée, la réduction se
        # répartit naturellement sur toutes les filières/départements au lieu
        # de pénaliser une seule matière.
        seances_placees = {m.id: 0 for m, _, _, _ in work}
        nb_seances_par_matiere = {m.id: nb for m, nb, _, _ in work}

        # Pré-traiter celles qui n'ont aucune salle candidate
        work_eligible = []
        for matiere, nb_seances, effectif, salles_ok in work:
            if not salles_ok:
                self.non_places.append(self._diagnostic(matiere, effectif, nb_seances))
            else:
                work_eligible.append((matiere, nb_seances, effectif, salles_ok))

        max_tours = max((nb for _, nb, _, _ in work_eligible), default=0)

        for tour in range(max_tours):
            progres_dans_le_tour = False

            for matiere, nb_seances, effectif, salles_ok in work_eligible:
                # Cette matière a déjà toutes ses séances placées ?
                if seances_placees[matiere.id] >= nb_seances:
                    continue

                # Tenter de placer une séance
                if self._placer_une_seance(matiere, salles_ok, effectif):
                    seances_placees[matiere.id] += 1
                    progres_dans_le_tour = True

            # Si un tour complet n'a placé aucune séance → arrêt anticipé
            if not progres_dans_le_tour:
                break

        # Diagnostic des séances manquantes
        for matiere, nb_seances, effectif, _ in work_eligible:
            manquantes = nb_seances - seances_placees[matiere.id]
            if manquantes > 0:
                self.non_places.append(
                    self._diagnostic(matiere, effectif, manquantes)
                )

        return self

    def _placer_une_seance(self, matiere, salles_ok, effectif) -> bool:
        """Tenter de placer UNE seule séance pour cette matière.

        Retourne True si placée, False sinon. Mise à jour des tables de
        contraintes en cas de succès.
        """
        best       = None
        best_score = float('inf')

        for jour in JOURS:
            for (heure_debut, heure_fin) in PLAGES:
                k = (jour, heure_debut)

                if matiere.niveau_id in self._niveau_pris[k]:
                    continue
                if matiere.enseignant_id and matiere.enseignant_id in self._enseignant_pris[k]:
                    continue

                for salle in salles_ok:
                    if salle.id in self._salle_prise[k]:
                        continue
                    score = self._score(jour, heure_debut, salle, matiere, effectif)
                    if score < best_score:
                        best_score = score
                        best = (jour, heure_debut, heure_fin, salle)

        if best is None:
            return False

        jour, heure_debut, heure_fin, salle = best
        k = (jour, heure_debut)

        self._salle_prise[k].add(salle.id)
        if matiere.enseignant_id:
            self._enseignant_pris[k].add(matiere.enseignant_id)
            self._enseignant_heures[matiere.enseignant_id].append((jour, heure_debut))
        self._niveau_pris[k].add(matiere.niveau_id)
        self._matiere_jours[matiere.id].append(jour)

        self.places.append({
            'emploi_du_temps_id': self.edt.pk,
            'matiere_id':         matiere.pk,
            'salle_id':           salle.pk,
            'jour':               jour,
            'heure_debut':        heure_debut,
            'heure_fin':          heure_fin,
            'genere_auto':        True,
        })

        self._preview.append({
            'matiere':    matiere.code,
            'intitule':   matiere.intitule,
            'niveau':     str(matiere.niveau),
            'filiere':    matiere.niveau.filiere.code,
            'enseignant': str(matiere.enseignant) if matiere.enseignant else '—',
            'salle':      salle.nom,
            'capacite':   salle.capacite,
            'effectif':   effectif,
            'jour':       jour,
            'heure':      f'{heure_debut}–{heure_fin}',
        })
        return True

    # ─── Persistance ─────────────────────────────────────────────────────────

    @transaction.atomic
    def sauvegarder(self) -> int:
        """
        Persister tous les créneaux générés en base de données.
        Si ecraser=True, supprime d'abord les créneaux auto-générés existants.
        Retourne le nombre de créneaux effectivement créés.
        """
        if self.ecraser:
            Creneau.objects.filter(
                emploi_du_temps=self.edt,
                genere_auto=True,
            ).delete()

        objs = [Creneau(**c) for c in self.places]
        created = Creneau.objects.bulk_create(objs, ignore_conflicts=True)
        return len(created)


# ── Vue API ───────────────────────────────────────────────────────────────────

class GenerationView(APIView):
    """
    POST /api/emplois/generer/

    Workflow nominal (basé session) :
      Body JSON : { "session_id": <int>, "campus_id": <int>, "dry_run": false }
      → crée 1 EmploiDuTemps par campus de la session (s'il n'existe pas déjà)
      → génère les créneaux pour les matières de la session
      → bascule l'état de la session vers 'genere'

    Workflow legacy (compatibilité) :
      Body JSON : { "emploi_du_temps_id": <int>, "filiere_ids": [...], ... }
      → utilise un EDT existant et des filières spécifiques.

    Réponse :
    {
      "success"        : true,
      "dry_run"        : false,
      "session"        : { id, libelle, etat },
      "edt_id"         : 12,
      "nb_places"      : 42,
      "nb_non_places"  : 3,
      "duree_ms"       : 128,
      "non_places"     : [ { matiere, intitule, niveau, raisons, ... }, ... ],
      "apercu"         : [ { matiere, salle, jour, heure, ... }, ... ]  // si dry_run
    }
    """
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        session_id  = request.data.get('session_id')
        campus_id   = request.data.get('campus_id')
        edt_id      = request.data.get('emploi_du_temps_id')
        filiere_ids = request.data.get('filiere_ids', [])
        ecraser     = bool(request.data.get('ecraser', False))
        dry_run     = bool(request.data.get('dry_run', False))

        # ── Branche 1 : workflow basé session ─────────────────────────────────
        if session_id:
            try:
                session = SessionPlanification.objects.get(pk=session_id)
            except SessionPlanification.DoesNotExist:
                return Response({'error': f"Session ID={session_id} introuvable."}, status=404)

            if session.etat == 'archive':
                return Response(
                    {'error': "Cette session est archivée — génération impossible."},
                    status=400,
                )

            # Si campus_id fourni → générer 1 EDT pour ce campus
            # Sinon → utiliser/créer un EDT générique sans campus pour la session
            campus = None
            if campus_id:
                try:
                    campus = Campus.objects.get(pk=campus_id)
                except Campus.DoesNotExist:
                    return Response({'error': f"Campus ID={campus_id} introuvable."}, status=404)

            # Récupérer ou créer l'EDT de cette session pour ce campus
            edt, _ = EmploiDuTemps.objects.get_or_create(
                session=session,
                campus=campus,
                type_planning='cours',
                defaults={
                    'semaine_debut':    session.semaine_debut,
                    'semaine_fin':      session.semaine_fin,
                    'semestre':         session.semestre,
                    'annee_academique': session.annee_academique,
                    'est_publie':       False,
                },
            )

            # En mode session, on régénère toujours proprement (ecraser implicite).
            ecraser = True

        # ── Branche 2 : workflow legacy par EDT + filières ───────────────────
        else:
            session = None
            if not edt_id:
                return Response(
                    {'error': "Fournir 'session_id' (recommandé) ou 'emploi_du_temps_id' + 'filiere_ids'."},
                    status=400,
                )
            if not filiere_ids:
                return Response(
                    {'error': "Le champ 'filiere_ids' doit contenir au moins une filière."},
                    status=400,
                )
            try:
                edt = EmploiDuTemps.objects.get(pk=edt_id)
            except EmploiDuTemps.DoesNotExist:
                return Response({'error': f"EmploiDuTemps ID={edt_id} introuvable."}, status=404)

        # ── Lancer l'algorithme ───────────────────────────────────────────────
        t0 = time.perf_counter()

        scheduler = ChronoFSScheduler(
            edt,
            session=session,
            filiere_ids=filiere_ids,
            ecraser=ecraser,
        )
        scheduler.run()

        duree_ms = round((time.perf_counter() - t0) * 1000)

        # ── Sauvegarder (si pas dry_run) ──────────────────────────────────────
        nb_sauvegardes = len(scheduler.places)
        if not dry_run:
            nb_sauvegardes = scheduler.sauvegarder()

            # Bascule de l'état de session si tout s'est bien passé
            if session and session.etat in ('collecte', 'pret'):
                session.etat      = 'genere'
                session.genere_le = timezone.now()
                session.save(update_fields=['etat', 'genere_le'])

        # ── Construire la réponse ─────────────────────────────────────────────
        return Response({
            'success':       True,
            'dry_run':       dry_run,
            'ecraser':       ecraser,
            'session':       (
                {'id': session.id, 'libelle': session.libelle, 'etat': session.etat}
                if session else None
            ),
            'edt_id':        edt.id,
            'nb_places':     nb_sauvegardes,
            'nb_non_places': len(scheduler.non_places),
            'duree_ms':      duree_ms,
            'non_places':    scheduler.non_places,
            # Aperçu limité à 100 lignes pour ne pas saturer le navigateur
            'apercu':        scheduler._preview[:100] if dry_run else [],
        })
