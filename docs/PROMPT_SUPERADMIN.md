# Prompt — Profil Super-administrateur ChronoFS (à envoyer à Claude Code)

> Copie tout le bloc ci-dessous dans une nouvelle session Claude Code ouverte à la racine `C:\xampp\ChronoFS`.

---

## 🎯 Mission

Ajouter un **3ᵉ profil « Super-administrateur »** à ChronoFS (au-dessus du DAR et du Chef de département). Il doit permettre de :

1. **Gérer les comptes** : créer / modifier / réinitialiser / désactiver les comptes **DAR** et **Chef de département**.
2. **Gérer les contraintes du solver** (règles) : ajouter, modifier, supprimer, activer/désactiver — **statiques** (les 9 règles dures déjà codées, verrouillées) et **dynamiques** (nouvelles, paramétrables).
3. **Gérer les fonctions objectif** du solver (ex. « priorité aux vacataires ») : ajouter, modifier, supprimer, réordonner, pondérer, activer/désactiver.
4. Disposer d'un **dashboard pro, dynamique, animé**, avec des statistiques pertinentes.

Et côté **DAR** : lors d'une génération, afficher une **modale de sélection des règles** — les statiques cochées **et verrouillées** (non décochables), les dynamiques cochables/décochables pour cette génération précise. Le solver applique exactement la configuration validée.

> **Contexte métier** : la FS-UEB est une faculté jeune, qui grandit et change souvent. D'où le besoin de rendre les règles configurables sans redéploiement, tout en garantissant que le noyau de règles dures reste inviolable et que le solver reste rapide et correct.

---

## 📚 Étape 0 — Lis d'abord ces fichiers (ne code rien avant)

Backend :
- `backend/core/constants.py` — enums métier, `Role` (DAR / CHEF_DEPT), `StatutEnseignant`, créneaux, `TOLERANCE_SURCAPACITE`, `salle_speciale_requise()`.
- `backend/core/models/users.py` — `User(AbstractUser)` + `UniqueConstraint unique_dar_account`.
- `backend/core/permissions.py` — `IsDAR`, `IsChefDept`, `IsDARorReadOnly`, `ScopedToOwnDept`.
- `backend/core/scheduling/solver.py` — `PlanningSolver`, contraintes **H1–H9** + objectif lexicographique (5 niveaux). **C'est le cœur à rendre configurable.**
- `backend/core/scheduling/generation_service.py` — `generer_planning(semaine, time_limit_sec)`.
- `backend/core/views/semaines.py` — action `generer` (`POST /api/semaines/<id>/generer/`).
- `backend/core/views/chefs.py` + `backend/core/serializers/users.py` — **patron exact** de création de compte (mot de passe généré, renvoyé en clair une fois, notification). À réutiliser.
- `backend/core/views/referentiel.py` + `backend/core/urls.py` — patron ViewSet + router.
- `backend/core/serializers/auth.py` — `LoginSerializer` (claims JWT `role`, `username`), `MeSerializer`.

Frontend :
- `frontend/src/App.jsx` — `Protected`, `RoleRedirect`, routing par rôle.
- `frontend/src/components/layout/Sidebar.jsx` — `DAR_NAV` / `CHEF_NAV`.
- `frontend/src/pages/dar/Dashboard.jsx` — **patron dashboard** : `KpiCard`, `useCountUp`, recharts (Bar/Pie), `staggerContainer`/`staggerItem`, palette réactive au thème.
- `frontend/src/pages/dar/Chefs.jsx` — patron page de gestion de comptes (à consulter).
- `frontend/src/hooks/useCrud.js`, `frontend/src/services/api.js` — à réutiliser tels quels.
- `frontend/tailwind.config.js` — **charte** (couleurs `primary` navy `#143894`, `gold` `#C8A15A`, `ink`, `surface`, `line`, fonts, ombres `card`).
- `frontend/src/components/ui/*` — `Button`, `Modal`, `Table`, `Badge`, `ConfirmDialog`, `Skeleton`, `Toaster`, `PageShell`.
- `frontend/src/lib/motion.js` — `staggerContainer`, `staggerItem`.

**Commence en mode plan** : propose d'abord le modèle de données + la liste des endpoints + l'arborescence des pages, fais-les-moi valider, PUIS implémente.

---

## 🧭 Décisions d'architecture IMPOSÉES (ne pas dévier sans me demander)

1. **Registre de règles paramétrées, PAS de code/DSL arbitraire.**
   Chaque contrainte et chaque objectif possède un `code` stable relié à un *handler* Python dans le solver. La BDD stocke **métadonnées + paramètres + activation**, jamais du code exécutable. Le super-admin **compose** des règles dynamiques à partir d'un **catalogue de templates paramétrés** (voir §Solver). Interdiction absolue d'`eval`/`exec` ou d'exécuter une expression saisie par l'utilisateur.

2. **Animations = `framer-motion` + `recharts` uniquement. PAS de Remotion.**
   Remotion est un moteur de rendu vidéo, hors-stack et inadapté à un dashboard live. Réutilise exactement les patterns de `dar/Dashboard.jsx`.

3. **Statique = verrouillé côté serveur.** Les 9 règles dures (H1–H9) sont **toujours** appliquées. Le backend les ré-impose quelle que soit la requête client. Le DAR ne peut basculer que les règles **dynamiques** non verrouillées. Idem pour les objectifs verrouillés.

4. **Rétrocompatibilité + perf.** `POST /generer/` sans corps doit produire **exactement** le même résultat qu'aujourd'hui (même pré-filtrage des salles candidates, mêmes `num_search_workers`, même `random_seed=42`, même limite de temps). Les toggles ne sont que des conditions autour du code existant → surcoût négligeable. Ajoute un test « golden » qui le prouve.

5. **Migrations additives et idempotentes.** Aucune donnée existante cassée. Data-migration pour **seeder** les 9 contraintes + les 5 objectifs comme verrouillés/statiques, et le compte super-admin.

---

## 🗄️ Backend — spécification

### 1. Rôle
Ajoute `SUPERADMIN = 'SUPERADMIN', 'Super administrateur'` à `Role` (`core/constants.py`). Conserve `unique_dar_account`. Le super-admin a `departement = null`.

### 2. Nouveaux modèles (`core/models/`)

**`RegleSolver`** (contrainte) :
- `code` (SlugField unique) — ex `H1`…`H9`, ou `R_<slug>` pour les dynamiques.
- `nom` (court), `description` (lisible DAR).
- `type_regle` : `DURE` | `SOUPLE` (TextChoices).
- `categorie` : `STATIQUE` | `DYNAMIQUE`.
- `verrouillee` (bool) — si `True` : non supprimable, structure non modifiable, toujours appliquée. Les 9 = `STATIQUE` + `verrouillee=True`.
- `active_par_defaut` (bool) — état initial de la case dans la modale DAR.
- `template` (SlugField, nullable) — nom du template paramétré pour les dynamiques ; `null` pour H1–H9 (codées en dur).
- `parametres` (JSONField, défaut `{}`) — ex `{"max": 1}`.
- `ordre` (int), `created_at`, `updated_at`.

**`FonctionObjectif`** :
- `code` (SlugField unique) — ex `OBJ_MAX_COURS`, `OBJ_VACATAIRES`, `OBJ_EQUITE`, `OBJ_CONTINUITE`, `OBJ_CAPACITE`.
- `nom`, `description`.
- `sens` : `MAX` | `MIN`.
- `priorite` (int) — **rang** dans la cascade lexicographique (1 = plus prioritaire). Le **poids `w` est dérivé automatiquement des bornes** par le solver (comme aujourd'hui), jamais saisi à la main → hiérarchie lexicographique stricte garantie.
- `verrouillee`, `active_par_defaut` (bool).
- `template` (SlugField, nullable), `parametres` (JSONField).
- `ordre`, `created_at`, `updated_at`.

**`JournalGeneration`** (audit + stats dashboard) :
- `semaine` (FK), `lancee_par` (FK User, `SET_NULL`), `lancee_le` (auto).
- `regles_appliquees` (JSON : liste de codes), `objectifs_appliques` (JSON).
- `nb_demandes`, `nb_placees`, `nb_non_placees`, `taux` (float), `duree_ms`, `statut_solver`.

> Enregistre l'app dans les migrations : `makemigrations` doit être propre, aucune migration en conflit.

### 3. Solver — refactor en registre (`core/scheduling/`)

- Crée un **registre de contraintes** : un mapping `code -> builder(model, ctx)`. Les 9 dures actuelles deviennent des builders enregistrés (`H1`…`H9`) — **découpe le corps de `_construire_modele` sans changer la logique**.
- Crée un **registre de templates de contraintes dynamiques**, avec pour chacun : schéma de paramètres + builder CP-SAT. Catalogue initial minimal (extensible) :
  - `MAX_COURS_ENSEIGNANT_CRENEAU` — params `{max:int}` (généralise « 1 classe par prof/créneau »).
  - `RESERVER_TYPE_SALLE_DEPARTEMENT` — params `{type_salle, code_departement}` (généralise SBAA terrain/labo).
  - `INTERDIRE_CRENEAU` / `INTERDIRE_JOUR` — params `{creneau|jour, portee: FILIERE|DEPARTEMENT|GLOBAL, cible?}`.
  - `MAX_COURS_JOUR_FILIERE` — params `{max:int}`.
- Crée un **registre d'objectifs** : chaque objectif = `(code, sens, borne(ctx), terme(ctx))`. Reconstruis `_construire_objectif` pour **itérer sur les objectifs actifs triés par `priorite`** et dériver les poids bottom-up (garde exactement la méthode de calcul actuelle des bornes/poids). Template objectif initial : `PRIORITE_STATUT` params `{statut}` (généralise « vacataires prioritaires »).
- `PlanningSolver.__init__` accepte `regles_actives: set[str] | None` et `objectifs_actifs: list[dict] | None`. Si `None` → charge la config par défaut depuis la BDD (verrouillées + `active_par_defaut`). **Les `verrouillee=True` sont toujours injectées, quoi qu'il arrive.**
- **Validation** : rejette tout template inconnu ou paramètre hors-schéma **avant** de construire le modèle (jamais d'`INFEASIBLE` brut dû à une règle mal formée). Valide aussi le type des params.
- Ne touche pas au pré-filtrage des salles candidates ni aux paramètres de perf.

### 4. `generation_service` + endpoint `generer`

`POST /api/semaines/<id>/generer/` — corps **optionnel** (rétrocompatible) :
```json
{
  "time_limit_sec": 30,
  "regles_desactivees": ["R_xxx"],
  "objectifs_desactives": ["OBJ_xxx"]
}
```
- Le backend calcule la config effective = (toutes les `verrouillee`) ∪ (dynamiques `active_par_defaut` **moins** `regles_desactivees`). **Ignore toute tentative de désactiver une règle/objectif verrouillé** (jamais confiance au client).
- Passe la config résolue au solver, puis **écris une ligne `JournalGeneration`** avec la config réellement appliquée et le résultat.

### 5. Endpoints (ViewSets, `permission_classes=[IsSuperAdmin]`)

Ajoute `IsSuperAdmin` dans `core/permissions.py` (calqué sur `IsDAR`). Enregistre dans `core/urls.py` :
- `regles-solver/` (CRUD) — bloque `DELETE`/modif structurelle si `verrouillee=True` (400 message clair). Autorise seulement `active_par_defaut`/`description`/`ordre` sur les verrouillées.
- `fonctions-objectif/` (CRUD + réordonnancement `priorite`), mêmes garde-fous verrouillé.
- `comptes/` — gestion **DAR + Chefs** par le super-admin. Réutilise le patron `ChefDeptViewSet` (mot de passe généré renvoyé une fois, notification `COMPTE_CREE`). Pour un compte **DAR** : respecte `unique_dar_account` (créer si aucun, sinon message clair + endpoint reset).
- `journal-generation/` (lecture seule) + `stats-superadmin/` (agrégats pour le dashboard).
- Lecture des règles/objectifs aussi accessible au **DAR** (pour la modale) : expose `GET /api/regles-solver/` et `GET /api/fonctions-objectif/` en lecture au DAR (permission lecture DAR+SuperAdmin, écriture SuperAdmin seul).

### 6. Seed (management command idempotente `seed_superadmin` ou data-migration)
- Crée les 9 `RegleSolver` (`H1`…`H9`, `DURE`, `STATIQUE`, `verrouillee=True`, `active_par_defaut=True`) avec `nom`/`description` tirés des docstrings du solver.
- Crée les 5 `FonctionObjectif` (`priorite` 1→5 comme l'ordre lexicographique actuel), `OBJ_VACATAIRES` avec `template=PRIORITE_STATUT`, `parametres={"statut":"VACATAIRE"}`.
- Crée le compte super-admin : **user `FS-UEB` / mot de passe `FS-UEB@#2026.`**, `role=SUPERADMIN`, `is_staff=True`. Idempotent (get_or_create). Ajoute un rappel « changez ce mot de passe à la première connexion » et permets une surcharge via variable d'environnement.

---

## 🎨 Frontend — spécification

### Routing / navigation
- `App.jsx` : `RoleRedirect` → `SUPERADMIN` vers `/superadmin`. Ajoute les routes `/superadmin/*` sous `<Protected role="SUPERADMIN">`.
- `authStore` : gère déjà `role`, RAS.
- `Sidebar.jsx` : ajoute `ADMIN_NAV` et branche-le quand `role === 'SUPERADMIN'` (même composant, même charte « tablette verre glacé »).

### Pages `/superadmin` (dossier `frontend/src/pages/superadmin/`)
1. **Dashboard** (`/superadmin`) — réutilise `KpiCard` + `useCountUp` + `staggerContainer` + recharts. Stats pertinentes :
   - KPIs : comptes (DAR/chefs/superadmins), départements, filières, enseignants, salles.
   - Donut **permanents vs vacataires** (lié à l'objectif priorité vacataires).
   - Barres **comptes par rôle**.
   - Aire/ligne **taux de réussite des générations dans le temps** (depuis `journal-generation`).
   - Carte **cascade des objectifs** (ordre lexicographique visualisé) + compteur règles actives/total.
   - Durée moyenne de génération, dernier statut solver.
2. **Comptes** (`/superadmin/comptes`) — table + modale création (DAR/Chef), reset mot de passe (affiché une fois), activer/désactiver. Réutilise `useCrud`, `Table`, `Modal`, `ConfirmDialog`.
3. **Contraintes** (`/superadmin/contraintes`) — liste avec badges `type_regle` / `categorie` / cadenas si `verrouillee`. Les 9 statiques en lecture (cadenas). Création d'une règle dynamique via **sélecteur de template + formulaire de paramètres** généré depuis le schéma. Éditer/supprimer les dynamiques.
4. **Objectifs** (`/superadmin/objectifs`) — liste **réordonnable par glisser-déposer** (utilise `@dnd-kit`, déjà installé) pour la `priorite` ; toggler activation ; éditer poids/params des dynamiques ; verrouillés non supprimables.
5. **Journal** (`/superadmin/journal`) — historique des générations (semaine, auteur, taux, durée, statut, config appliquée).

### Modale DAR de génération (impact `frontend/src/pages/dar/` — Semaines/Planning)
Avant de lancer `generer`, ouvrir une **modale** :
- Charge `GET /api/regles-solver/` + `GET /api/fonctions-objectif/`.
- **Règles statiques/verrouillées** : cases **cochées + désactivées** (`disabled`), avec cadenas et infobulle « toujours appliquée ».
- **Règles dynamiques** : cases cochables, pré-cochées selon `active_par_defaut`.
- (Optionnel, section repliée) toggles des objectifs non verrouillés.
- Bouton **Générer** → envoie `regles_desactivees` / `objectifs_desactives` calculés. Affiche ensuite le résumé (placées / non placées / durée) comme aujourd'hui.

---

## 🎨 Charte à respecter (obligatoire)
- Couleurs via tokens Tailwind uniquement : `primary-900` `#143894` (navy), `gold-400` `#C8A15A` (accent), `ink-*`, `surface-*`, `line-*`, `page`. **N'invente aucune couleur.** Support **dark mode** (`dark:` + `themeStore`) partout.
- Typo : `font-display` (Cormorant Garamond) pour les titres via `heading-display`, `font-sans` (Plus Jakarta Sans) pour le reste ; classes utilitaires existantes `eyebrow`, `heading-display`, `num`, `pulse-dot`, `card`.
- Ombres `shadow-card` / `card-md` / `card-lg`. Icônes `lucide-react`. Toasts via `toastStore`. Confirmations via `ConfirmDialog`/`confirmStore`.
- Recharts avec palette **réactive au thème** (copie l'approche de `dar/Dashboard.jsx`).
- Animations sobres et pro (entrées en cascade, compteurs, survols) ; respecte `useReducedMotion`.

---

## ✅ Qualité, tests, garde-fous BDD
- `makemigrations` + `migrate` **sans conflit** ; data-migrations idempotentes ; aucune donnée existante perdue.
- **Sécurité** : tous les endpoints super-admin en `IsSuperAdmin` ; un DAR/Chef ne doit **jamais** accéder aux endpoints super-admin (écris les tests). Jamais d'`eval`/`exec`. Valide les params de templates côté serveur.
- **Verrouillage** : impossible de supprimer/désactiver/dénaturer une règle ou un objectif `verrouillee=True`, ni via API ni via la modale DAR (tests des deux).
- **Perf & non-régression solver** : test « golden » — `generer` sans corps donne le même placement qu'avant le refactor (mêmes seed/workers/pré-filtrage). Toggler une règle dynamique change le résultat comme attendu ; une règle verrouillée reste appliquée même si le client tente de la retirer.
- **Comptes** : test création DAR quand un DAR existe déjà (rejet propre), création chef (mot de passe renvoyé une fois), reset password.
- `npm run lint` propre côté frontend.
- Mets à jour `ARCHITECTURE.md` (rôles, nouveaux modèles, registre de règles, endpoint `generer` enrichi) et `README.md` (compte super-admin de seed).

## 🚫 À NE PAS faire
- Pas de Remotion, pas de nouvelle lib d'animation, pas de migration Tailwind v4.
- Pas d'exécution de code/expression saisie par l'utilisateur.
- Ne casse ni les rôles existants, ni `unique_dar_account`, ni le comportement par défaut du solver.
- Ne mets pas le mot de passe super-admin en clair ailleurs que dans le seed idempotent (+ possibilité de surcharge par variable d'environnement).

## 📦 Livrables
1. Plan validé (modèle de données + endpoints + arborescence pages) **avant** implémentation.
2. Backend : rôle, modèles, migrations + seed, refactor solver en registre, endpoints, `generer` enrichi, tests.
3. Frontend : routing + `ADMIN_NAV`, 5 pages super-admin, modale DAR de sélection des règles, respect charte.
4. Docs mises à jour + récap des commandes pour tester (`migrate`, `seed_superadmin`, `runserver`, `npm run dev`).
