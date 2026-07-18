# Architecture & conventions — ChronoFS

Guide technique du projet : architecture, modèle métier, conventions et règles de gestion.

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

### Salles spéciales : terrain et laboratoire (réservés au département SBAA)
Le `TERRAIN` et le `LABO` ne sont **jamais** choisis pour un cours ordinaire (un cours de TIC n'a rien à faire sur un terrain). Ils sont réservés aux **TP du seul département `SBAA`**, selon la fonction `salle_speciale_requise()` dans `core/constants.py` :

| Cours | Salle imposée |
|---|---|
| TP `SBAA`, intitulé d'UE **contenant « chimie »** (insensible à la casse) | **`LABO`** — 1 filière par créneau (capacité normale) |
| TP `SBAA`, **autre intitulé** (pratique agricole, etc.) | **`TERRAIN`** — capacité illimitée, **plusieurs filières SBAA simultanément** |
| Tout le reste (autres départements, CM/TD/séminaire/projet, TP non-SBAA) | Salles classiques uniquement (`SALLES_AUTORISEES_PAR_TYPE_COURS`, qui **exclut** terrain et labo) |

Conséquences techniques :
- **H2 ne s'applique pas au `TERRAIN`** (partage entre filières) ; le `LABO` garde l'unicité salle/créneau.
- Le drapeau dénormalisé `Seance.salle_partageable` (dérivé du type de salle) lève la contrainte d'unicité BD `seance_salle_unique` pour les seules séances en terrain. Positionné par `Seance.save()` et explicitement à la génération (`bulk_create` ne passe pas par `save()`).
- Mêmes règles appliquées aux **modifications manuelles** du DAR (`views/semaines.py`, `serializers/seances.py`) : impossible de poser à la main un cours non-SBAA sur le terrain/labo.
- Le code du département concerné est `CODE_DEPARTEMENT_SALLES_SPECIALES = 'SBAA'` et le mot-clé labo `MOT_CLE_LABO = 'chimie'` (`core/constants.py`). Limites actuelles du référentiel : un seul `LABO` (Ébolowa, 25 places), aucun à Monatélé.

### Conflits enseignant
Un enseignant dans plusieurs départements est **normal** — pas un conflit. Conflit = **même enseignant + même jour + même heure_debut** dans le même `EmploiDuTemps`.

### Algorithme de génération (`core/scheduling/solver.py`, OR-Tools CP-SAT)
Le chef IMPOSE jour + créneau dans son fichier Excel ; le solver choisit **uniquement la salle** de chaque `DemandeCours` (variables booléennes `x[d, s]`).

**Contraintes dures** (jamais violées) : H1 ≤ 1 salle/demande · H2 ≤ 1 cours par (salle, jour, créneau) · H3 ≤ 1 cours par (enseignant, jour, créneau) · H4 ≤ 1 cours par (filière, jour, créneau) · H5 capacité avec tolérance de sur-effectif (+40 %, cf. ci-dessus) · H6 type de salle compatible avec le type de cours (dont salles spéciales SBAA terrain/labo, cf. ci-dessus) · H7 ville salle = ville filière · H7bis campus imposé (`campus_obligatoire`) respecté · **H8 un enseignant n'enseigne que dans UNE ville par jour** (pas d'aller-retour inter-villes, quel que soit l'écart de créneaux) · **H9 une filière (classe) reste dans UN SEUL campus pour toute la semaine** (pas de saut de campus, même en même ville).

**Objectif** (lexicographique, poids `w1 ≫ w2 ≫ w3 ≫ w_cont ≫ w_cap`) : 1) maximiser le **nombre de cours placés** (« tous les cours de la semaine doivent être faits ») ; 2) **priorité aux vacataires** (`statut = VACATAIRE`) ; 3) **équité** — à nombre de cours égal, sacrifier d'abord les filières les plus programmées ; 4) **continuité de salle** — minimiser le nombre de salles distinctes par `(filière)` sur la semaine : une classe garde la même salle d'un créneau au suivant et d'un jour à l'autre, on ne la déplace que si c'est inévitable (variables `u[(filière, salle)]`, cf. `_construire_objectif`) ; 5) ajuster **capacité ≈ effectif** (minimiser gaspillage et forçage). La continuité passe **avant** l'ajustement de capacité : on préfère garder la classe dans sa salle plutôt que de la déménager pour gagner quelques places.

**Pipeline** : `POST /api/semaines/<id>/generer/` → régénère les `Seance` en base → renvoie les cours non plaçables avec raisons lisibles (jamais « infeasible » brut) → DAR publie via `POST /api/semaines/<id>/publier/` → export PDF/DOCX. Taux de programmation par département : `GET /api/semaines/<id>/taux-programmation/`.

## Profil Super-administrateur & configuration du solver

La FS-UEB étant une faculté jeune et évolutive, un **3ᵉ rôle `SUPERADMIN`** (au-dessus de DAR et CHEF_DEPT) permet de faire évoluer les règles de génération **sans redéploiement**, tout en gardant le noyau de règles dures inviolable.

### Rôle & comptes
- `Role.SUPERADMIN` (`core/constants.py`). La contrainte `unique_dar_account` reste en vigueur.
- Le super-admin gère les comptes **DAR + Chef** via `POST/PATCH/DELETE /api/comptes/` (+ `reset-password/`), même patron que la gestion des chefs par le DAR (mot de passe généré renvoyé une fois). Seed : `python manage.py seed_superadmin` (compte `FS-UEB`, surchargeable par `SUPERADMIN_USERNAME`/`SUPERADMIN_PASSWORD`).

### Registre de configuration (jamais de code exécuté)
Les contraintes et objectifs du solver sont décrits par des **métadonnées en BDD** reliées à des *handlers Python* du registre (`core/scheduling/registre.py`) — aucun `eval`/`exec`, aucune expression saisie par l'utilisateur.

| Modèle (`core/models/configuration.py`) | Rôle |
|---|---|
| `RegleSolver` | Une contrainte : `code`, `type_regle` (DURE/SOUPLE), `categorie` (STATIQUE/DYNAMIQUE), `verrouillee`, `active_par_defaut`, `template`, `parametres` (JSON). |
| `FonctionObjectif` | Un terme de l'objectif lexicographique : `priorite` (rang), `sens`, `verrouillee`, `template`, `parametres`. Le **poids `w` est dérivé des bornes** par le solver, jamais stocké. |
| `JournalGeneration` | Audit d'une génération (config appliquée + résultat) → dashboard super-admin. |

- **Règles statiques (H1–H9)** : seedées `verrouillee=True`, **toujours appliquées** par le solver (H1 structurel, H5/H6/H7 dans le pré-filtrage des salles, H2/H3/H4/H8/H9 via `REGISTRE_CONTRAINTES`). Affichées cochées+désactivées dans la modale DAR.
- **Règles dynamiques** : composées par le super-admin depuis un **catalogue de templates paramétrés** (`REGISTRE_TEMPLATES` : `MAX_COURS_ENSEIGNANT_CRENEAU`, `MAX_COURS_JOUR_FILIERE`, `INTERDIRE_JOUR`, `INTERDIRE_CRENEAU`, `RESERVER_TYPE_SALLE_DEPARTEMENT`). Ajouter un template = ajouter une fonction builder + son schéma.
- **Objectifs** : `REGISTRE_OBJECTIFS` reproduit à l'identique la cascade historique (test « golden ») ; le super-admin peut réordonner la `priorite` (drag-drop).

### Sélection à la génération (DAR)
`POST /api/semaines/<id>/generer/` accepte un corps **optionnel** (rétrocompatible) :
`{ time_limit_sec, regles_desactivees[], regles_activees[], objectifs_desactives[], objectifs_activees[] }`.
`resoudre_config()` (`generation_service.py`) calcule la config effective = **verrouillées (toujours)** ∪ dynamiques cochées. Toute tentative de désactiver une entrée verrouillée est ignorée. Une ligne `JournalGeneration` est écrite après chaque génération. Sans corps → comportement identique à l'existant.

### Endpoints (permission `IsSuperAdmin`, lecture règles/objectifs ouverte au DAR)
`/api/regles-solver/` (+ `templates/`), `/api/fonctions-objectif/` (+ `reordonner/`), `/api/comptes/`, `/api/journal-generation/`, `/api/stats-superadmin/`.

### Frontend
Espace `/superadmin` (`frontend/src/pages/superadmin/`) : **Dashboard** (KPIs, taux de réussite, cascade des objectifs), **Comptes**, **Contraintes**, **Objectifs** (drag-drop `@dnd-kit`), **Journal**. La modale DAR `components/planning/GenerationModal.jsx` est branchée dans `pages/dar/{Planning,Semaines}.jsx`.

## Points d'attention

- **Tailwind CSS v3** uniquement — ne pas migrer vers v4.
- Toutes les apps exposent leur API (viewsets en `AllowAny` pour le développement — à passer en `IsAuthenticated` avant déploiement).
- Le venv Python doit **toujours être activé** avant d'exécuter une commande Django.
- L'effectif utilisé pour l'algorithme est celui du `Niveau` (pas de la `Filiere`).
- Le PDF d'export doit respecter le format officiel UEB : en-tête bilingue (FR gauche / Logo centre / EN droite), grille Lundi→Samedi × 4 plages, signature "Le Doyen".
