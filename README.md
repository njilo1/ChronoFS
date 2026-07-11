# FSChrono v2

Progressive Web App de génération automatique d'emplois du temps pour la
**Faculté des Sciences de l'Université d'Ébolowa (FS-UEB)**
## Stack

| Couche | Technologie |
|---|---|
| Frontend | React 18 · Vite 5 · Tailwind CSS v3 · framer-motion · zustand · @dnd-kit |
| Backend | Django 5.1 · DRF · djangorestframework-simplejwt · drf-spectacular |
| Solver | OR-Tools (CP-SAT) |
| Documents | openpyxl (Excel) · WeasyPrint (PDF) · python-docx (Word) |
| Base de données | PostgreSQL 15+ |
| PWA | vite-plugin-pwa |

## Démarrage rapide (développement)

```bash
# Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env  # éditer les valeurs
python manage.py migrate
python manage.py seed_demo        # données + comptes de test (dar/dar123, chef_tic/tic123…)
python manage.py seed_superadmin  # compte super-admin + config solver fondatrice
python manage.py runserver

# Frontend (nouveau terminal)
cd frontend
npm install
npm run dev
```

API : http://localhost:8000/api/  ·  UI : http://localhost:5173

### Comptes

| Rôle | Identifiant | Mot de passe |
|---|---|---|
| Super-administrateur | `FS-UEB` | `FS-UEB@#2026.` (à changer — surchargeable via `SUPERADMIN_PASSWORD` dans `.env`) |
| DAR | `dar` | `dar123` |
| Chef (ex. TIC) | `chef_tic` | `tic123` |

Le **super-administrateur** gère les comptes (DAR + chefs) et la configuration du
solver (règles/contraintes + fonctions objectif). Voir [`ARCHITECTURE.md`](./ARCHITECTURE.md#profil-super-administrateur--configuration-du-solver).

## Documentation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — guide architectural détaillé
- [`docs/references/`](./docs/references/) — templates Excel et PDF officiels UEB
- [`docs/archives/`](./docs/archives/) — anciens documents de contexte (v1)
- [`docs/Manuel_Utilisateur_ChronoFS.docx`](./docs/Manuel_Utilisateur_ChronoFS.docx) — manuel utilisateur v1
