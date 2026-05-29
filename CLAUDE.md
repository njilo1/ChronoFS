# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Présentation

ChronoFS est un logiciel de gestion des emplois du temps de la Faculté des Sciences de l'Université d'Ebolowa (FS-UEB). Stack : **React 19 + Vite + Tailwind CSS v3** (frontend) / **Django 4.2 + DRF + PostgreSQL** (backend). Auth JWT via `djangorestframework-simplejwt`.

## Commandes

### Backend (toujours depuis `backend/`)
```bash
source venv/bin/activate                  # À faire EN PREMIER dans chaque terminal
python manage.py runserver                # API sur http://localhost:8000
python manage.py makemigrations           # Après toute modification de modèle
python manage.py migrate                  # Appliquer les migrations
python manage.py test <app>               # Tests d'une app (ex: python manage.py test salles)
python manage.py test                     # Tous les tests
sudo service postgresql start             # Si PostgreSQL est arrêté
```

### Frontend (depuis `frontend/`)
```bash
npm run dev       # Dev sur http://localhost:5173
npm run build     # Build de production
npm run lint      # ESLint
npm run preview   # Prévisualiser le build
```

## Architecture

### Modèles Django et leurs relations

```
Campus (ville, code) ← Ebolowa / Monatélé — isole les salles d'un site à l'autre
  └── Salle (campus FK, nom unique, capacite, est_disponible)

Departement
  └── Filiere (departement FK, campus FK) ← effectif global de la filière
        └── Niveau (filiere FK) ← L1/L2/L3/M1/M2 — effectif propre à chaque niveau
              └── Matiere (niveau FK, enseignant FK)
                    └── Creneau (matiere FK, salle FK, emploi_du_temps FK)

Enseignant (departements ManyToMany → peut appartenir à plusieurs départements)

EmploiDuTemps (campus FK, type_planning [cours/examen/rattrapage], semaine_debut, semaine_fin, semestre, annee_academique, est_publie)
  ├── Creneau          ← unité de base d'un planning de cours
  └── CreneauExamen    ← unité d'un planning examen/rattrapage (filiere, niveau, surveillants, chef_salle)

SessionPlanification (semaine, etat [collecte → pret → genere → publie → archive])
  └── ImportDepartement (session FK, departement FK, importe bool)
```

La contrainte de conflit enseignant est gérée via `UniqueConstraint` en base : `(emploi_du_temps, matiere, jour, heure_debut)`. La contrainte salle idem : `(emploi_du_temps, salle, jour, heure_debut)`.

### Structure des apps Django

| App | Contenu |
|---|---|
| `config/` | settings, urls racine, wsgi/asgi |
| `salles/` | Modèles `Campus` + `Salle` — API complète |
| `filieres/` | `Departement`, `Filiere`, `Niveau` — API complète |
| `enseignants/` | `Enseignant` (ManyToMany departements) — API complète |
| `matieres/` | `Matiere` (type CM/TD/TP, volume horaire) + endpoint d'import Excel par département — API complète |
| `plannings/` | `EmploiDuTemps` + `Creneau` + `CreneauExamen` — cœur de l'EDT, API + export PDF |
| `planification/` | `SessionPlanification` + `ImportDepartement` — workflow hebdomadaire de collecte/génération/publication |
| `emplois/` | Algorithme de génération automatique (Greedy + MRV, contraintes dures H1–H5 + douces S1–S6) — opérationnel |

### Pattern API (chaque app suit ce patron)
Chaque app expose : `models.py` → `serializers.py` → `views.py` (ModelViewSet) → `urls.py` (router) → branché dans `config/urls.py` sous `/api/`.

### Configuration clé (settings.py)
- CORS autorisé uniquement depuis `http://localhost:5173`
- Pagination globale : 20 éléments par page (`?page=2` pour naviguer)
- Filtrage global : `?nom=X` (exact), `?search=X` (texte), `?ordering=X` (tri)
- Auth : JWT — header requis : `Authorization: Bearer <token>`
- Endpoints token : `POST /api/token/` (login) et `POST /api/token/refresh/`
- Timezone : `Africa/Douala` — Language : `fr-fr`

## Règles métier critiques

### Plages horaires FIXES (ne jamais calculer dynamiquement)
| Début | Fin | Note |
|---|---|---|
| 07:30 | 10:00 | Cours |
| 10:15 | 12:45 | Cours (pause 10:00–10:15) |
| 13:00 | 15:30 | Cours (pause 12:45–13:00) |
| 15:45 | 18:15 | Cours (pause 15:30–15:45) |

### Attribution des salles (par effectif décroissant)
```
≥ 150  → Salle E (220 places)
80–149 → Salle A ou B (100 places)
30–79  → Salle M ou N (30-40 places)
15–29  → Salles D/F/G/H/I/J/K/L (20 places)
≤ 15   → Bureaux (15 places)
```
**Tolérance de sur-effectif (forçage)** : faute de salle idéale libre, une salle peut être remplie jusqu'à `capacité × (1 + TOLERANCE_SURCAPACITE)`, soit **+40 %** (ex. une salle de 50 places monte à ~70). Constante `TOLERANCE_SURCAPACITE` dans `core/constants.py`. Le solver pénalise ce forçage (`FACTEUR_SURCHARGE`) pour ne l'utiliser qu'en dernier recours.

### Conflits enseignant
Un enseignant dans plusieurs départements est **normal** — pas un conflit. Conflit = **même enseignant + même jour + même heure_debut** dans le même `EmploiDuTemps`.

### Algorithme de génération (`core/scheduling/solver.py`, OR-Tools CP-SAT)
Le chef IMPOSE jour + créneau dans son fichier Excel ; le solver choisit **uniquement la salle** de chaque `DemandeCours` (variables booléennes `x[d, s]`).

**Contraintes dures** (jamais violées) : H1 ≤ 1 salle/demande · H2 ≤ 1 cours par (salle, jour, créneau) · H3 ≤ 1 cours par (enseignant, jour, créneau) · H4 ≤ 1 cours par (filière, jour, créneau) · H5 capacité avec tolérance de sur-effectif (+40 %, cf. ci-dessus) · H6 type de salle compatible avec le type de cours · H7 ville salle = ville filière · H7bis campus imposé (`campus_obligatoire`) respecté · **H8 un enseignant n'enseigne que dans UNE ville par jour** (pas d'aller-retour inter-villes, quel que soit l'écart de créneaux) · **H9 une filière (classe) reste dans UN SEUL campus pour toute la semaine** (pas de saut de campus, même en même ville).

**Objectif** (lexicographique, poids `w1 ≫ w2 ≫ w3 ≫ w4`) : 1) maximiser le **nombre de cours placés** (« tous les cours de la semaine doivent être faits ») ; 2) **priorité aux vacataires** (`statut = VACATAIRE`) ; 3) **équité** — à nombre de cours égal, sacrifier d'abord les filières les plus programmées ; 4) ajuster **capacité ≈ effectif** (minimiser gaspillage et forçage).

**Pipeline** : `POST /api/semaines/<id>/generer/` → régénère les `Seance` en base → renvoie les cours non plaçables avec raisons lisibles (jamais « infeasible » brut) → DAR publie via `POST /api/semaines/<id>/publier/` → export PDF/DOCX. Taux de programmation par département : `GET /api/semaines/<id>/taux-programmation/`.

## Points d'attention

- **Tailwind CSS v3** uniquement — ne pas migrer vers v4.
- Toutes les apps exposent leur API (viewsets en `AllowAny` pour le développement — à passer en `IsAuthenticated` avant déploiement).
- Le venv Python doit **toujours être activé** avant d'exécuter une commande Django.
- L'effectif utilisé pour l'algorithme est celui du `Niveau` (pas de la `Filiere`).
- Le PDF d'export doit respecter le format officiel UEB : en-tête bilingue (FR gauche / Logo centre / EN droite), grille Lundi→Samedi × 4 plages, signature "Le Doyen".
