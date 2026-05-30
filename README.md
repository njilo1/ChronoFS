# FSChrono v2

Progressive Web App de génération automatique d'emplois du temps pour la
**Faculté des Sciences de l'Université d'Ébolowa (FS-UEB)**, Cameroun.

> 🚧 **Branche en cours de refonte** — `refactor/v2-clean`
> Toute la documentation détaillée (architecture, conventions, modèle métier)
> est dans [`ARCHITECTURE.md`](./ARCHITECTURE.md). Le README complet (installation,
> identifiants de test, scripts) sera produit en fin de refactoring (Phase 10).

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
python manage.py seed_demo  # données de test (disponible Phase 1)
python manage.py runserver

# Frontend (nouveau terminal)
cd frontend
npm install
npm run dev
```

API : http://localhost:8000/api/  ·  UI : http://localhost:5173

## Documentation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — guide architectural détaillé
- [`docs/references/`](./docs/references/) — templates Excel et PDF officiels UEB
- [`docs/archives/`](./docs/archives/) — anciens documents de contexte (v1)
- [`docs/Manuel_Utilisateur_ChronoFS.docx`](./docs/Manuel_Utilisateur_ChronoFS.docx) — manuel utilisateur v1
