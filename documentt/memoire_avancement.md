# Mémoire de soutenance ChronoFS — Fichier de reprise

> Fichier de travail pour reprendre la rédaction du mémoire après un redémarrage.
> Dernière mise à jour : **2026-07-05**.

## ▶️ Comment reprendre (IMPORTANT)
1. Ouvrir un terminal et lancer Claude Code **depuis ce dossier** :
   ```bash
   cd "/home/neo/Bureau/ChronoFS (copier 1)"
   claude
   ```
   (Sinon la mémoire du projet ne se charge pas automatiquement.)
2. Dire à Claude : « **On reprend le mémoire, lis `documentt/memoire_avancement.md`** ».
3. Répondre aux 3 questions en attente ci-dessous → Claude génère le `.docx` et continue.

## 📌 État d'avancement
- [x] Analyse de la charte + du mémoire modèle de l'aîné
- [x] Plan validé = structure **charte** (Intro → Revue de littérature → Matériel & Méthodes → Résultats & Discussion → Conclusion), **sans stage**
- [x] Introduction générale **rédigée** (ci-dessous), en attente de validation
- [ ] **EN ATTENTE de ta réponse** (3 questions ci-dessous)
- [ ] Génération du `.docx` (page de garde + introduction)
- [ ] Chapitre suivant : **Revue de la littérature**

## ❓ Questions en attente (à répondre à la reprise)
1. **Titre** choisi parmi les 4 propositions (ou ajustement) — voir liste plus bas.
2. Le **style** de l'introduction convient-il ? (plus simple / plus soutenu ?)
3. On garde la forme **impersonnelle** (charte, pas de « je »/« nous ») ? — recommandé. Le mémoire de l'aîné, lui, utilise « nous ».

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

## 📝 Propositions de titre
1. **« Conception et réalisation d'une application web de génération automatique des emplois du temps : cas de la Faculté des Sciences de l'Université d'Ébolowa »** ⭐ (recommandé)
2. « Conception et implémentation d'un système de génération d'emplois du temps sous contraintes pour un établissement multi-campus : le cas de la FS-UEB »
3. « Génération automatique des emplois du temps universitaires par programmation par contraintes : conception et réalisation de la plateforme ChronoFS »
4. « Automatisation de la planification académique : ChronoFS, une application web de génération d'emplois du temps sans conflit à la FS-UEB »

## 📄 Introduction générale (rédigée — à valider)

**INTRODUCTION GÉNÉRALE**

À chaque rentrée académique, une même contrainte s'impose aux établissements d'enseignement supérieur : faire tenir, sur une simple grille hebdomadaire, des centaines d'heures de cours sans qu'aucune ne se chevauche. Derrière cette grille en apparence anodine se cache l'un des problèmes d'organisation les plus étudiés en informatique, celui de l'élaboration des emplois du temps universitaires. À la Faculté des Sciences de l'Université d'Ébolowa (FS-UEB), sa résolution se révèle particulièrement ardue en raison de la configuration de l'établissement : une formation répartie sur deux campus, Ébolowa et Monatélé, plusieurs départements aux effectifs inégaux et un parc de salles limité et hétérogène, qui va du petit bureau à l'amphithéâtre.

Construire un emploi du temps consiste alors à satisfaire en même temps une série d'exigences qui, réunies, entrent souvent en conflit. Un enseignant ne peut assurer deux cours au même moment ; une salle ne peut recevoir deux groupes à la fois ; une classe ne suit qu'un seul enseignement à la fois ; la capacité d'une salle doit rester en rapport avec l'effectif qu'elle accueille ; enfin, certaines activités, comme les travaux pratiques de quelques filières, réclament des locaux spécifiques. À ces règles s'ajoute une contrainte propre à la Faculté : dans une même journée, ni un enseignant ni une classe ne peuvent être renvoyés d'un campus à l'autre.

Dans les faits, cette planification demeure très largement artisanale. Elle s'appuie sur des tableurs remplis à la main et sur de multiples échanges entre le responsable des emplois du temps et les chefs de département. Un tel procédé atteint vite ses limites : la moindre modification — un enseignant indisponible, une salle réaffectée — oblige à reprendre la grille entière, les conflits échappent facilement à la vigilance, et le temps englouti dans cette tâche se fait au détriment d'autres missions. Le résultat dépend surtout de l'expérience de la personne qui s'en charge, ce qui le rend difficile à reproduire d'un semestre à l'autre.

De ce constat naît la question à laquelle ce mémoire s'efforce de répondre : **comment concevoir un outil informatique capable de produire automatiquement, pour une faculté répartie sur plusieurs campus, des emplois du temps complets et sans conflit, dans le respect des contraintes de salle, d'enseignant et de filière ?**

Pour y répondre, ce travail poursuit un objectif principal : concevoir et réaliser une application web, baptisée ChronoFS, dédiée à la génération automatique des emplois du temps hebdomadaires de la FS-UEB. Cet objectif se décline en plusieurs objectifs spécifiques :

- modéliser avec précision le problème de planification propre à la Faculté, en séparant les contraintes à respecter impérativement de celles qu'il est seulement souhaitable de satisfaire ;
- concevoir une architecture logicielle claire, distinguant l'interface utilisateur, la logique métier et le stockage des données ;
- doter l'application d'un moteur de résolution sous contraintes, chargé d'affecter à chaque cours une salle et un créneau appropriés ;
- offrir des espaces de travail adaptés à chaque acteur de la planification, en particulier le responsable des emplois du temps et les chefs de département ;
- générer, à partir des plannings obtenus, des documents officiels conformes au format attendu par l'établissement.

La suite du document respecte les normes académiques en vigueur. La première partie dresse la revue de la littérature consacrée au problème d'emploi du temps et aux méthodes employées pour le traiter. La deuxième présente le matériel et les méthodes : les technologies retenues, la démarche de conception et la modélisation du problème. La troisième expose et discute les résultats, autrement dit l'application réalisée et son comportement face aux données réelles de la Faculté. Une conclusion générale revient enfin sur les apports de ce travail, ses limites et les perspectives qu'il ouvre.

## 🗂️ Ressources
- Charte (texte) : `documentt/charte_texte.txt` · PDF : `documentt/CHARTE DES MEMOIRES_SHORT 2.pdf`
- Mémoire modèle de l'aîné (texte) : `documentt/aine_texte.txt` · PDF : `documentt/creation_application_pour_plantes_Récupération_automatique.pdf`
- Contenu technique du projet : `ARCHITECTURE.md`, `README.md`
