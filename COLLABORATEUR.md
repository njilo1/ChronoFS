# Guide du collaborateur — ChronoFS

Bienvenue 👋 Ce guide explique comment installer ChronoFS en local, le tester, et
faire remonter tes retours. Merci de prendre le temps d'inspecter le projet !

> Pour comprendre l'architecture et le modèle métier, lis [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## 1. Prérequis à installer

| Outil | Version | Vérifier avec |
|---|---|---|
| Python | 3.10+ (testé sur 3.13) | `python3 --version` |
| Node.js | 18+ | `node --version` |
| PostgreSQL | 15+ | `psql --version` |
| Git | — | `git --version` |

### Bibliothèques système pour les exports PDF (WeasyPrint)

L'export PDF a besoin de bibliothèques système **en plus** du `pip install`.

- **Linux (Debian / Ubuntu / Kali)** :
  ```bash
  sudo apt install libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 libffi-dev
  ```
- **macOS** : `brew install pango gdk-pixbuf libffi`
- **Windows** : voir la doc officielle WeasyPrint (installation GTK).

> Sans ces libs, l'app démarre mais la génération de PDF plante.

---

## 2. Récupérer le projet

```bash
git clone https://github.com/njilo1/ChronoFS.git
cd ChronoFS
```

La branche `main` est la version stable. Le développement en cours se fait sur
`refactor/v2-clean`.

---

## 3. Configurer la base de données

Crée une base PostgreSQL, puis copie le fichier d'environnement :

```bash
cp .env.example .env
```

Édite `.env` et renseigne au minimum les valeurs PostgreSQL
(`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`)
ainsi qu'une `DJANGO_SECRET_KEY` (génère-la avec la commande indiquée dans le fichier).

---

## 4. Lancer le backend (terminal 1)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows : venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo        # charge des données + comptes de test
python manage.py runserver        # API sur http://localhost:8000
```

## 5. Lancer le frontend (terminal 2)

```bash
cd frontend
npm install
npm run dev                       # UI sur http://localhost:5173
```

> ⚠️ **Utilise bien `npm run dev`** (et pas `npm run preview`). Le proxy qui relie
> le frontend à l'API n'est actif qu'en mode `dev` ; en `preview` la connexion
> échoue (erreur 404 au login).

Ouvre ensuite **http://localhost:5173** dans ton navigateur.

---

## 6. Comptes de test

| Identifiant | Mot de passe | Rôle |
|---|---|---|
| `dar` | `dar123` | DAR — accès complet (recommandé pour inspecter) |
| `chef_tic` | `tic123` | Chef de département TIC |
| `chef_pa` | `pa123` | Chef de département PA |

---

## 7. Donner ton avis

- **Un bug, une remarque, une idée ?** → ouvre une **Issue** sur GitHub
  (onglet *Issues → New issue*). Décris ce que tu faisais, ce qui était attendu,
  ce qui s'est passé, et si possible une capture d'écran.
- **Tu veux proposer une correction de code ?** → crée ta propre branche et une
  **Pull Request** :
  ```bash
  git checkout -b test/ton-prenom
  # ... tes modifications ...
  git commit -m "description claire de ton changement"
  git push origin test/ton-prenom
  ```
  Ouvre ensuite une Pull Request sur GitHub.

### Règles de collaboration

- Ne pousse **jamais** directement sur `main` — passe toujours par une branche puis une PR.
- Ne commite **jamais** ton fichier `.env` (il est déjà ignoré par Git).
- Un commit = un changement clair, avec un message explicite.

Merci pour ton aide 🙏
