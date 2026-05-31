# Fichiers de test — simulation de soutenance

5 fichiers Excel au **format chef de département** (identiques au template officiel
FSChrono), générés à partir des plannings PDF officiels — **semaine du 01 au 06/06/2026**,
campus Ébolowa, semestre 1, année 2025-2026.

| Fichier | Département | Lignes (cours) |
|---|---|---|
| `Planning_TIC_S23_2026.xlsx`  | TIC | 62 |
| `Planning_PA_S23_2026.xlsx`   | Physique Appliquée (dont Machinisme Agricole à Monatélé) | 57 |
| `Planning_CA_S23_2026.xlsx`   | Chimie Appliquée | 20 |
| `Planning_SBM_S23_2026.xlsx`  | Science Biomédicale | 28 |
| `Planning_ROSE_S23_2026.xlsx` | Recherche Opérationnelle & Statistique | 28 |

Tous validés par le parser d'import réel : **0 erreur**.

## Comment les régénérer

```bash
cd backend && source venv/bin/activate
python manage.py seed_test_planning            # référentiel + 5 Excel dans ce dossier
python manage.py seed_test_planning --out /autre/chemin
```

La commande est **idempotente** (get_or_create) et ne supprime aucune donnée.

## Ce qui a été ajouté en base (référentiel)

Départements, classes, UE et enseignants nécessaires pour que l'import passe
sans erreur (« classe inexistante », « UE inconnue », « enseignant non
reconnu »). Le département **ROSE** a été créé ; TIC, PA, CA, SBM complétés.

## Comptes chefs de département

Chaque département est dirigé par un chef (login pour tester l'import côté chef) :

| Département | Identifiant | Mot de passe |
|---|---|---|
| TIC | `chef_tic` | `tic123` |
| Physique Appliquée | `chef_pa` | `pa123` |
| Chimie Appliquée | `vevo` | *(compte existant)* |
| Science Biomédicale | `chef_sbm` | `sbm123` |
| ROSE | `chef_rose` | `rose123` |

> DAR (accès complet) : `dar` / `dar123`.

## Démo conseillée

1. Connexion **DAR** (`dar` / `dar123`) → créer/ouvrir une semaine **01–06/06/2026**.
2. Importer les 5 fichiers (ou les remettre à chaque chef pour import par dept).
3. Lancer la **génération** → l'algorithme attribue les salles.
4. Montrer le taux de programmation, puis **publier** et exporter le PDF.

## Hypothèses (à connaître pour le jury)

- **Effectifs** : absents du PDF → valeurs réalistes par niveau (L1≈80, L2≈50,
  L3≈40, M1≈20, M2≈12), ajustables dans l'interface.
- **TIC, Physique Appliquée, ROSE** : grille fidèle au PDF (un cours par
  créneau réellement occupé).
- **Chimie Appliquée, SBM** : le PDF y éclate de nombreux cours sans
  classe/niveau explicites et avec des salles qui se chevauchent ; les données
  ont été regroupées en classes cohérentes et **importables** (sans conflit),
  au plus proche du PDF.
- Cours à plusieurs enseignants (« X et Y », « X/Y ») : on retient le premier.
- **Machinisme Agricole** (L1 et L2&L3) est rattaché à **Physique Appliquée** et
  basé à **Monatélé** (seule filière PA hors Ébolowa, extraite du PDF Monatélé) —
  utile pour démontrer la gestion multi-campus (contraintes H7/H8/H9).
