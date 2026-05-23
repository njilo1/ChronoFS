# CHRONOFS — Contexte Projet pour Claude Code

## Identité
- **Développeur** : TCHAMBA NJILO FERDINAND — Licence TIC L3
- **Université** : Université d'Ebolowa (UEB) — Faculté des Sciences
- **Encadreurs** : Dr. Kengni Olga + Dr. Nyabeye (Département TIC)
- **Soutenance** : Juin 2026
- **OS** : Kali Linux — username: `neo` — chemin: `~/Bureau/ChronoFS`

---

## Stack technique
| Couche | Technologie |
|---|---|
| Frontend | React.js + Vite + **Tailwind CSS v3** (pas v4) |
| Backend | Django + Django REST Framework |
| Base de données | PostgreSQL 18 |
| Auth | JWT (djangorestframework-simplejwt) |
| Import | openpyxl (fichiers Excel) |
| Export | reportlab ou weasyprint (PDF) |

---

## État d'avancement

### ✅ Déjà fait
- PostgreSQL configuré — `DB: chronofs_db` / `USER: chronofs_admin` / `PASSWORD: chronofs2026`
- Django créé, migré — superuser: `admin` / `admin2026`
- React + Vite tourne sur `http://localhost:5173`
- Tailwind CSS v3 configuré et fonctionnel
- Tous les modèles Django créés et migrés :
  - `Salle` (nom, capacite, campus, est_disponible)
  - `Departement` (nom, code)
  - `Filiere` (nom, code, effectif, departement FK)
  - `Niveau` (nom L1-M2, effectif, filiere FK)
  - `Enseignant` (nom, prenom, grade, email, departements ManyToMany)
  - `Matiere` (code, intitule, type CM/TD/TP, niveau FK, enseignant FK, volume_horaire)
  - `EmploiDuTemps` (semaine_debut, semaine_fin, semestre, annee_academique, est_publie)
  - `Creneau` (jour, heure_debut, heure_fin, matiere FK, salle FK, emploi_du_temps FK, genere_auto)
- API Salle créée (serializer + viewset + urls) — mode `AllowAny` pour test

### ⬜ Reste à faire (dans cet ordre)
1. APIs pour tous les autres modèles (serializers + views + urls)
2. Authentification JWT — Login React → token → Axios interceptor
3. Interface React Admin (Sidebar + Navbar + pages CRUD)
4. Import Excel des plannings des Chefs de Département
5. **Algorithme de génération automatique** (le plus important)
6. Grille EDT React (format UEB : 6 jours × 4 plages + pauses)
7. Export PDF format officiel UEB bilingue
8. Déploiement

---

## Contexte métier UEB

### Salles disponibles
| Salle(s) | Capacité | Campus |
|---|---|---|
| **E** (fusion C+E) | ~220 places | Campus Principal FS |
| **A, B** | ~100 places chacune | Campus Principal FS |
| **M, N** | ~30-40 places | Face CRA |
| **D,F,G,H,I,J,K,L** | ~20 places chacune | Lycée Classique / Principal |
| **2 Bureaux** | ~15 places | Campus Principal FS |

### Plages horaires FIXES (ne jamais modifier)
| Heure début | Heure fin | Type |
|---|---|---|
| 07:30 | 10:00 | Cours |
| 10:00 | 10:15 | **PAUSE** |
| 10:15 | 12:45 | Cours |
| 12:45 | 13:00 | **PAUSE** |
| 13:00 | 15:30 | Cours |
| 15:30 | 15:45 | **PAUSE** |
| 15:45 | 18:15 | Cours |

### Profils utilisateurs
- **V1 (maintenant)** : Administrateur uniquement (Dr. Tchinda) — connexion JWT requise
- **V2 (future)** : Professeur + Public (étudiants sans connexion)

---

## Algorithme de génération — CŒUR DU PROJET

### Contraintes DURES (jamais violées)
- Une salle = 1 cours max par créneau
- Un enseignant ne peut pas être à 2 endroits EN MÊME TEMPS
  - ⚠️ **IMPORTANT** : Un prof PEUT enseigner dans plusieurs départements à des heures différentes (réalité UEB)
  - Conflit = même prof + même jour + même heure_debut SEULEMENT
- Capacité salle jamais dépassée (tolérance 10% max si nécessaire)

### Contraintes SOUPLES (si possible)
- Éviter de programmer un prof matin ET soir le même jour
- Tolérance 10% sur capacité si aucune autre salle disponible

### Priorité d'attribution des salles
```
Effectif ≥ 150  →  Salle E (220 places) — priorité absolue
Effectif 80-149 →  Salle A ou B (100 places)
Effectif 30-79  →  Salle M ou N (30-40 places)
Effectif 15-29  →  Salles D/F/G/H/I/J/K/L (20 places)
Effectif ≤ 15   →  Bureaux (15 places)
```

### 6 phases de l'algorithme
1. **Lecture** — charger tous les cours importés depuis PostgreSQL
2. **Tri** — classer par effectif DÉCROISSANT (200+ traités en premier)
3. **Boucle** — pour chaque cours :
   - Trouver salle cible selon effectif
   - Vérifier salle libre à ce créneau → sinon chercher alternative
   - Vérifier enseignant libre à ce créneau → sinon décaler ou alerter
   - Attribuer et marquer salle + enseignant comme occupés
4. **Attribution** — enregistrer en base de données
5. **Vérification** — lister cours non placés + conflits restants → alertes admin
6. **Publication** — admin publie l'EDT + export PDF

### Cours non placés
Si un cours ne peut pas être placé → liste "cours non planifiés" + alerte admin.
Ne jamais ignorer silencieusement. L'admin résout manuellement les cas extrêmes.

---

## Structure du code

```
~/Bureau/ChronoFS/
├── backend/
│   ├── venv/                 ← TOUJOURS activer avant de coder
│   ├── config/
│   │   ├── settings.py       ← DB, CORS, JWT, INSTALLED_APPS
│   │   └── urls.py           ← URLs principales
│   ├── salles/               ← Modèle Salle + API déjà faite
│   ├── filieres/             ← Departement + Filiere + Niveau
│   ├── enseignants/          ← Enseignant
│   ├── matieres/             ← Matiere
│   ├── plannings/            ← EmploiDuTemps + Creneau
│   └── emplois/              ← Algorithme de génération
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   └── index.css         ← @tailwind base/components/utilities
    ├── tailwind.config.js    ← content: index.html + src/**/*.{js,jsx}
    └── vite.config.js
```

### Config PostgreSQL dans settings.py
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'chronofs_db',
        'USER': 'chronofs_admin',
        'PASSWORD': 'chronofs2026',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

### Commandes importantes
```bash
source venv/bin/activate          # TOUJOURS en premier
python manage.py runserver        # Django sur :8000
python manage.py makemigrations   # Après modif modèle
python manage.py migrate          # Appliquer migrations
sudo service postgresql start     # Si PostgreSQL arrêté
npm run dev                       # React sur :5173
```

---

## Format PDF officiel UEB (pour l'export)
- En-tête bilingue : Français gauche / Logo centre / Anglais droite
- N° de référence : `N° 26-00102 /UEb/DFS/DAARS`
- Titre : `PLANNING DES COURS — ANNÉE ACADÉMIQUE 2025-2026`
- Métadonnées : Semestre + Filière/Niveau + Campus + Salle + Semaine
- Grille : Lundi→Samedi (colonnes) × 4 plages horaires (lignes) + lignes de pause
- Note finale : *"Ce calendrier est dynamique et susceptible d'être modifié..."*
- Signature : "Le Doyen" bas droite

---

## Instructions pour Claude Code

### Méthode de travail OBLIGATOIRE
- Toujours expliquer POURQUOI avant de donner le code
- Commenter chaque partie importante du code
- Avancer UNE étape à la fois
- Ne jamais passer à la suivante si la précédente n'est pas validée
- Si erreur → expliquer ce qu'elle signifie avant la solution

### Points critiques
- Tailwind CSS **version 3** — pas la v4
- Plages horaires **FIXES** — jamais calculées dynamiquement
- Trier par effectif **DÉCROISSANT** avant attribution salles
- Prof dans plusieurs départements = **normal, pas un conflit**
- Conflit prof = **même heure seulement**
- venv Python = **toujours activé**
