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
Tolérance 10% si aucune salle idéale disponible.
```

### Conflits enseignant
Un enseignant dans plusieurs départements est **normal** — pas un conflit. Conflit = **même enseignant + même jour + même heure_debut** dans le même `EmploiDuTemps`.

### Algorithme de génération (app `emplois/`)
Greedy Best-First avec heuristique MRV (Minimum Remaining Values).

**Contraintes dures** (jamais violées) : H1 salle libre, H2 enseignant libre, H3 niveau libre, H4 capacité ≥ effectif (tolérance 10 %), H5 salle dans le même campus que la filière.

**Contraintes douces** (optimisées par score, bas = mieux) : S1 préférence horaire (10h15 > 13h > 7h30 > 15h45), S2 début de semaine, S3 minimiser gaspillage de places, S4/S5 éviter combinaisons fatigantes (7h30 + 15h45 ou 7h30 + 13h), S6 deux séances d'une même matière le même jour.

**Ordre de traitement MRV** : effectif décroissant → nb salles candidates croissant → code alpha (déterministe).

**Pipeline** : `POST /api/emplois/generer/` → place les `Creneau` en base → renvoie les cours non placés (jamais ignorés silencieusement) → admin publie via `POST /api/sessions/<id>/publier/` → export PDF.

## Points d'attention

- **Tailwind CSS v3** uniquement — ne pas migrer vers v4.
- Toutes les apps exposent leur API (viewsets en `AllowAny` pour le développement — à passer en `IsAuthenticated` avant déploiement).
- Le venv Python doit **toujours être activé** avant d'exécuter une commande Django.
- L'effectif utilisé pour l'algorithme est celui du `Niveau` (pas de la `Filiere`).
- Le PDF d'export doit respecter le format officiel UEB : en-tête bilingue (FR gauche / Logo centre / EN droite), grille Lundi→Samedi × 4 plages, signature "Le Doyen".
