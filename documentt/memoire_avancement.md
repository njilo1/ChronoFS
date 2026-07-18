# Mémoire de soutenance ChronoFS — Fichier de reprise

> Fichier de travail pour reprendre la rédaction du mémoire après un redémarrage.
> Dernière mise à jour : **2026-07-07**.

## ▶️ Comment reprendre (IMPORTANT)
1. Ouvrir un terminal et lancer Claude Code **depuis ce dossier** :
   ```bash
   cd "/home/neo/Bureau/ChronoFS (copier 1)"
   claude
   ```
   (Sinon la mémoire du projet ne se charge pas automatiquement.)
2. Dire à Claude : « **On reprend le mémoire, lis `documentt/memoire_avancement.md`** ».
3. Le mémoire complet est généré (voir ci-dessous) : relire, ajuster, régénérer via `python documentt/build_memoire.py`.

## 📌 État d'avancement — MÉMOIRE COMPLET GÉNÉRÉ
- [x] Analyse de la charte + du mémoire modèle de l'aîné
- [x] Plan validé = structure **charte** (Intro → Revue de littérature → Matériel & Méthodes → Résultats & Discussion → Conclusion), **sans stage**
- [x] Questions en attente tranchées avec les choix recommandés (titre n°1, style conservé, forme impersonnelle)
- [x] Introduction générale rédigée
- [x] Chapitre 1 — Revue de la littérature (rédigé, sources réelles vérifiées)
- [x] Chapitre 2 — Matériel et Méthodes (rédigé, contenu technique tiré d'ARCHITECTURE.md/README.md)
- [x] Chapitre 3 — Résultats et Discussion (rédigé, captures d'écran + données réelles du tableau de bord)
- [x] Conclusion générale, perspectives et recommandations (rédigée)
- [x] Pages liminaires (remerciements, résumé FR/EN, listes d'abréviations et de définitions)
- [x] Références bibliographiques (8 sources réelles et vérifiées, cf. liste plus bas)
- [x] `.docx` généré et conforme à la mise en forme de la charte (voir section Sortie ci-dessous)

## 📄 Sortie générée
- **Contenu rédigé (source) :** `documentt/memoire_contenu.md` — tout le texte des chapitres, éditable directement.
- **Script d'assemblage :** `documentt/build_memoire.py` — construit le `.docx` à partir du contenu + gère la mise en forme charte (pagination i/1/annexes, marges, styles, figures, tableaux, champs TOC).
- **Document final :** `documentt/ChronoFS_Memoire.docx`.
- Pour régénérer après une modification de texte : éditer `memoire_contenu.md` (ou les constantes de page de garde en tête de `build_memoire.py`), puis relancer `python documentt/build_memoire.py`.
- **À faire à l'ouverture dans Word :** clic droit sur la table des matières / liste des figures / liste des tableaux → « Mettre à jour les champs » (ou Ctrl+A puis F9) pour que la pagination et les numéros s'affichent (les champs sont posés mais Word doit les recalculer à l'ouverture — `updateFields` est déjà activé dans le document).

## ✅ Choix tranchés (plus en attente)
1. **Titre retenu :** proposition n°1 — *« Conception et réalisation d'une application web de génération automatique des emplois du temps : cas de la Faculté des Sciences de l'Université d'Ébolowa »*.
2. **Style de l'introduction :** conservé tel que rédigé initialement.
3. **Forme impersonnelle** (charte, pas de « je »/« nous ») : appliquée dans tout le document.

## 📚 Références bibliographiques retenues (vérifiées via recherche web, pas inventées)
Babaei, Karimpour & Hadidi (2015, survey UCTP) ; Burke & Petrovic (2002, directions de recherche timetabling) ; de Werra (1985, intro to timetabling) ; Even, Itai & Shamir (1976, NP-complétude) ; Russell & Norvig (2020, AIMA — CSP/MRV) ; documentation Google OR-Tools CP-SAT, Django, PostgreSQL. Liste complète dans `memoire_contenu.md`.

## 🔜 Prochaines étapes possibles (relecture humaine)
- Relire le style de chaque chapitre (le ton a été tenu impersonnel et sobre, mais une relecture par l'étudiant reste nécessaire avant dépôt).
- Vérifier auprès des encadreurs si des annexes sont exigées (aucune n'a été ajoutée pour l'instant, la charte ne les rend obligatoires que « s'il y en a »).
- Faire tourner le contrôle anti-plagiat de l'UFD avant dépôt (seuil de rejet : 25 %, cf. charte art. 7).
- Repage de garde : logos `docs/assets/logo_ueb.png` / `docs/assets/logo_fs.png` insérés automatiquement par le script ; vérifier leur rendu à l'impression.

## ⚙️ Décisions déjà prises
- Livrable : **Word .docx** — Times New Roman 12, interligne 1,5, marges 2,5 cm, texte justifié, pagination charte (i,ii… avant l'intro ; 1,2,3… ensuite ; I,II… pour les annexes).
- Rédaction **chapitre par chapitre** (validation à chaque étape).
- Rendu **sobre et pro**, noir sur blanc, sans couleurs gadget.
- Style **humanisé** (ne doit pas sonner « IA ») mais **impersonnel**.
- **Claude gère les diagrammes** (cas d'utilisation, classes, MLD, séquence, activité, architecture).

## 👤 Page de garde (infos)
- Auteur : **TCHAMBA NJILO FERDINAND** — Matricule **23I0076FS**
- Diplôme : **Licence en Architecture des Logiciels** (département TIC, FS-UEB)
- Encadreurs : **Dr KENGNI OLGA** et **Dr NYABEYE DORIS**
- Année académique : **2025-2026**
- Couverture : **blanche** (dépt TIC) · Logos : `docs/assets/logo_ueb.png`, `docs/assets/logo_fs.png`

## 🗂️ Ressources
- Charte (texte) : `documentt/charte_texte.txt` · PDF : `documentt/CHARTE DES MEMOIRES_SHORT 2.pdf`
- Mémoire modèle de l'aîné (texte) : `documentt/aine_texte.txt` · PDF : `documentt/creation_application_pour_plantes_Récupération_automatique.pdf`
- Contenu technique du projet : `ARCHITECTURE.md`, `README.md`
- **Texte intégral du mémoire (source unique, à éditer en priorité) :** `documentt/memoire_contenu.md`
- Titre retenu et introduction générale : voir `documentt/memoire_contenu.md` (section « INTRODUCTION GÉNÉRALE ») — ne plus dupliquer ici pour éviter toute divergence.
