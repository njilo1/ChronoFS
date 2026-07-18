# Contenu rédigé du mémoire ChronoFS — brouillon de travail

> Fichier intermédiaire : texte des chapitres avant mise en page Word (documentt/build_memoire.py le consomme).
> Style : impersonnel (charte), sans « je »/« nous ». Titre retenu : proposition n°1.

---

## REMERCIEMENTS

La réalisation de ce mémoire n'aurait pas été possible sans le concours de plusieurs personnes, auxquelles il convient d'exprimer ici toute sa gratitude.

Que Dr KENGNI OLGA et Dr NYABEYE DORIS, encadreurs de ce travail, trouvent ici l'expression d'une sincère reconnaissance pour la disponibilité, la rigueur et les orientations apportées tout au long de sa réalisation.

Que le corps enseignant et administratif du département des Technologies de l'Information et de la Communication de la Faculté des Sciences de l'Université d'Ébolowa soit remercié pour la formation dispensée durant tout le cursus de licence.

Que la Division des Affaires Académiques et de la Recherche et les chefs de département ayant accepté de partager les données et pratiques de planification en vigueur à la Faculté soient également remerciés, leur contribution ayant permis d'ancrer ce travail dans une réalité de terrain.

Enfin, que la famille et les proches ayant apporté un soutien constant durant la réalisation de ce travail soient chaleureusement remerciés.

---

## RÉSUMÉ

ChronoFS est une application web conçue et réalisée pour automatiser la génération des emplois du temps hebdomadaires de la Faculté des Sciences de l'Université d'Ébolowa (FS-UEB), un établissement réparti sur deux campus (Ébolowa et Monatélé) dont la planification reposait jusqu'ici sur des tableurs renseignés manuellement. Le problème est modélisé comme un problème de satisfaction de contraintes : neuf contraintes dures — dont deux propres à la répartition géographique de la Faculté — encadrent l'affectation d'une salle à chaque cours, tandis qu'une fonction objectif lexicographique arbitre entre les solutions admissibles restantes (taux de placement, priorité aux vacataires, équité entre filières, continuité de salle, adéquation capacité-effectif). La résolution est confiée au solveur de programmation par contraintes CP-SAT de la bibliothèque OR-Tools, intégré dans une architecture à trois niveaux : interface web progressive (React), API REST (Django REST Framework) et base de données relationnelle (PostgreSQL). L'application offre des espaces de travail différenciés à la Division des Affaires Académiques et de la Recherche et aux chefs de département, et produit des documents conformes aux formats officiels de l'établissement (PDF, Excel, Word). Sur les données réelles de la Faculté, la génération d'une semaine complète de cours s'exécute en quelques secondes et respecte l'ensemble des contraintes dures posées. Les limites identifiées — dépendance à la qualité des imports, référentiel de salles spéciales encore restreint — ouvrent des perspectives d'amélioration.

**Mots-clés :** emploi du temps, programmation par contraintes, OR-Tools, planification universitaire, application web, FS-UEB.

## ABSTRACT

ChronoFS is a web application designed and developed to automate the generation of weekly timetables for the Faculty of Science of the University of Ebolowa (FS-UEB), an institution spread across two campuses (Ebolowa and Monatélé) whose scheduling previously relied on manually maintained spreadsheets. The problem is modelled as a constraint satisfaction problem: nine hard constraints — two of which are specific to the Faculty's geographic distribution — govern room assignment for each course, while a lexicographic objective function arbitrates between the remaining feasible solutions (placement rate, priority to part-time lecturers, fairness across programmes, room continuity, capacity-to-headcount fit). Resolution is delegated to the CP-SAT constraint programming solver from the OR-Tools library, embedded in a three-tier architecture: progressive web app front end (React), REST API (Django REST Framework) and relational database (PostgreSQL). The application provides dedicated workspaces for the Academic Affairs and Research Division and for department heads, and produces documents compliant with the institution's official formats (PDF, Excel, Word). On real Faculty data, generating a full week of courses runs in a few seconds and satisfies all hard constraints. Identified limitations — dependency on import data quality, a still-limited pool of special-purpose rooms — open avenues for further improvement.

**Keywords:** timetabling, constraint programming, OR-Tools, university scheduling, web application, FS-UEB.

---

## LISTE DES ABRÉVIATIONS, SIGLES ET ACRONYMES

| Sigle | Signification |
|---|---|
| API | Application Programming Interface (interface de programmation) |
| CA | Département de Chimie Appliquée |
| CM | Cours Magistral |
| CP | Constraint Programming (programmation par contraintes) |
| CP-SAT | Constraint Programming – Satisfiability (solveur de contraintes d'OR-Tools) |
| CSP | Constraint Satisfaction Problem (problème de satisfaction de contraintes) |
| DAR | Division des Affaires Académiques et de la Recherche |
| DRF | Django REST Framework |
| FS-UEB | Faculté des Sciences de l'Université d'Ébolowa |
| JWT | JSON Web Token |
| MRV | Minimum Remaining Values |
| ORM | Object-Relational Mapping (mapping objet-relationnel) |
| PA | Département de Physique Appliquée |
| PDF | Portable Document Format |
| PLNE | Programmation Linéaire en Nombres Entiers |
| PWA | Progressive Web Application (application web progressive) |
| REST | Representational State Transfer |
| ROSE | Département de Recherche Opérationnelle, Statistique et Économétrie |
| SBAA | Département des Sciences Biologiques et Agronomie Appliquée |
| SBM | Département des Sciences Biomédicales |
| TD | Travaux Dirigés |
| TIC | Département des Technologies de l'Information et de la Communication |
| TP | Travaux Pratiques |
| UE | Unité d'Enseignement |
| UML | Unified Modeling Language |
| UTP | University Timetabling Problem (problème d'emploi du temps universitaire) |

## LISTE DES DÉFINITIONS

- **Contrainte dure :** règle de planification dont la violation rend un emploi du temps inutilisable (ex. : un enseignant sur deux cours simultanés).
- **Contrainte souple :** règle de planification dont le respect est souhaitable mais non impératif (ex. : continuité de salle d'une classe).
- **Créneau :** plage horaire fixe (07h30–10h00, 10h15–12h45, 13h00–15h30 ou 15h45–18h15) au sein d'une journée de cours.
- **Emploi du temps (planning) :** affectation complète des cours d'une semaine aux couples (salle, créneau) disponibles.
- **Filière :** parcours de formation rattaché à un département, décliné en niveaux (L1 à M2).
- **Séance :** occurrence effective d'un cours, résultant du placement d'une demande de cours par le solveur ou d'un ajustement manuel.
- **Semaine de planification :** unité de temps sur laquelle porte un cycle complet de collecte, génération et publication d'un emploi du temps.
- **Solveur :** programme chargé de rechercher une solution satisfaisant un ensemble de contraintes, éventuellement en optimisant une fonction objectif.

---

## INTRODUCTION GÉNÉRALE

À chaque rentrée académique, une même contrainte s'impose aux établissements d'enseignement supérieur : faire tenir, sur une simple grille hebdomadaire, des centaines d'heures de cours sans qu'aucune ne se chevauche. Derrière cette grille en apparence anodine se cache l'un des problèmes d'organisation les plus étudiés en informatique, celui de l'élaboration des emplois du temps universitaires. À la Faculté des Sciences de l'Université d'Ébolowa (FS-UEB), sa résolution se révèle particulièrement ardue en raison de la configuration de l'établissement : une formation répartie sur deux campus, Ébolowa et Monatélé, plusieurs départements aux effectifs inégaux et un parc de salles limité et hétérogène, qui va du petit bureau à l'amphithéâtre.

Construire un emploi du temps consiste alors à satisfaire en même temps une série d'exigences qui, réunies, entrent souvent en conflit. Un enseignant ne peut assurer deux cours au même moment ; une salle ne peut recevoir deux groupes à la fois ; une classe ne suit qu'un seul enseignement à la fois ; la capacité d'une salle doit rester en rapport avec l'effectif qu'elle accueille ; enfin, certaines activités, comme les travaux pratiques de quelques filières, réclament des locaux spécifiques. À ces règles s'ajoute une contrainte propre à la Faculté : dans une même journée, ni un enseignant ni une classe ne peuvent être renvoyés d'un campus à l'autre.

Dans les faits, cette planification demeure très largement artisanale. Elle s'appuie sur des tableurs remplis à la main et sur de multiples échanges entre le responsable des emplois du temps et les chefs de département. Un tel procédé atteint vite ses limites : la moindre modification — un enseignant indisponible, une salle réaffectée — oblige à reprendre la grille entière, les conflits échappent facilement à la vigilance, et le temps englouti dans cette tâche se fait au détriment d'autres missions. Le résultat dépend surtout de l'expérience de la personne qui s'en charge, ce qui le rend difficile à reproduire d'un semestre à l'autre.

De ce constat naît la question à laquelle ce mémoire s'efforce de répondre : comment concevoir un outil informatique capable de produire automatiquement, pour une faculté répartie sur plusieurs campus, des emplois du temps complets et sans conflit, dans le respect des contraintes de salle, d'enseignant et de filière ?

Pour y répondre, ce travail poursuit un objectif principal : concevoir et réaliser une application web, baptisée ChronoFS, dédiée à la génération automatique des emplois du temps hebdomadaires de la FS-UEB. Cet objectif se décline en plusieurs objectifs spécifiques :

- modéliser avec précision le problème de planification propre à la Faculté, en séparant les contraintes à respecter impérativement de celles qu'il est seulement souhaitable de satisfaire ;
- concevoir une architecture logicielle claire, distinguant l'interface utilisateur, la logique métier et le stockage des données ;
- doter l'application d'un moteur de résolution sous contraintes, chargé d'affecter à chaque cours une salle et un créneau appropriés ;
- offrir des espaces de travail adaptés à chaque acteur de la planification, en particulier le responsable des emplois du temps et les chefs de département ;
- générer, à partir des plannings obtenus, des documents officiels conformes au format attendu par l'établissement.

La suite du document respecte les normes académiques en vigueur. La première partie dresse la revue de la littérature consacrée au problème d'emploi du temps et aux méthodes employées pour le traiter. La deuxième présente le matériel et les méthodes : les technologies retenues, la démarche de conception et la modélisation du problème. La troisième expose et discute les résultats, autrement dit l'application réalisée et son comportement face aux données réelles de la Faculté. Une conclusion générale revient enfin sur les apports de ce travail, ses limites et les perspectives qu'il ouvre.

---

## CHAPITRE 1 — REVUE DE LA LITTÉRATURE

### 1.1. Introduction

Avant de présenter la solution retenue pour la Faculté des Sciences de l'Université d'Ébolowa, il convient de situer le problème de l'emploi du temps universitaire dans le champ scientifique qui l'étudie depuis plus d'un demi-siècle. Ce chapitre définit les concepts fondamentaux du domaine, expose la complexité théorique du problème, passe en revue les grandes familles de méthodes de résolution proposées dans la littérature, puis dégage la position de ChronoFS par rapport à ces travaux.

### 1.2. Concepts fondamentaux

Le problème d'emploi du temps universitaire, désigné dans la littérature anglo-saxonne par l'acronyme UTP (*University Timetabling Problem*), consiste à affecter un ensemble d'activités d'enseignement — cours magistraux, travaux dirigés, travaux pratiques — à des couples (salle, créneau horaire), de manière à satisfaire un ensemble de contraintes (Babaei et al., 2015). Deux catégories de contraintes structurent systématiquement ce type de problème :

- les **contraintes dures** (*hard constraints*), dont la violation rend l'emploi du temps inutilisable : un enseignant ou une classe ne peuvent être sollicités deux fois au même moment, une salle ne peut accueillir deux activités simultanément, la capacité d'une salle doit être respectée ;
- les **contraintes souples** (*soft constraints*), dont la satisfaction est seulement souhaitable : régularité des horaires, minimisation des trous dans l'emploi du temps d'un enseignant, continuité d'une classe dans une même salle, etc.

Un emploi du temps est dit *faisable* lorsque toutes les contraintes dures sont respectées, et *de bonne qualité* lorsqu'il minimise, en outre, la violation des contraintes souples (de Werra, 1985).

### 1.3. Complexité du problème

La difficulté du problème d'emploi du temps n'est pas seulement pratique : elle est théorique. Even, Itai et Shamir (1976) ont démontré qu'une version, pourtant restreinte, du problème formulé par Gotlieb est NP-complète, ce qui entraîne la NP-complétude de la quasi-totalité des variantes rencontrées en pratique. Concrètement, cela signifie qu'aucun algorithme connu ne permet, dans le cas général, de garantir une solution optimale en un temps qui reste raisonnable lorsque le nombre de cours, de salles et d'enseignants augmente : la taille de l'espace des solutions croît de façon exponentielle. Ce résultat explique pourquoi la recherche s'est très tôt orientée vers deux directions complémentaires : la modélisation du problème sous une forme mathématique exploitable par des solveurs génériques, et la conception d'heuristiques capables de produire de bonnes solutions en un temps limité, sans garantie d'optimalité absolue.

La modélisation par la théorie des graphes a occupé une place historique importante. De Werra (1985) montre qu'une partie du problème d'emploi du temps peut se ramener à une coloration de graphe : chaque activité devient un sommet, une arête relie deux activités qui ne peuvent partager le même créneau (parce qu'elles impliquent le même enseignant, la même classe ou la même salle), et chaque couleur représente un créneau horaire. Si cette réduction éclaire la structure combinatoire du problème, elle ne suffit pas à elle seule à traiter les contraintes de capacité de salle ou les préférences souples propres aux emplois du temps universitaires réels, ce qui a motivé le recours à des formalismes plus expressifs.

### 1.4. Approches de résolution

La littérature distingue traditionnellement trois grandes familles de méthodes pour traiter l'UTP : les approches de recherche opérationnelle, les métaheuristiques, et les méthodes fondées sur l'intelligence artificielle et la satisfaction de contraintes (Babaei et al., 2015 ; Burke et Petrovic, 2002).

#### 1.4.1. Approches exactes de recherche opérationnelle

Ces approches modélisent le problème sous forme mathématique — le plus souvent en programmation linéaire en nombres entiers (PLNE) — où des variables booléennes représentent l'affectation d'un cours à un couple (salle, créneau), et où les contraintes dures sont traduites en (in)égalités linéaires. Un solveur générique explore alors l'espace des solutions, par séparation et évaluation (*branch and bound*), jusqu'à trouver une solution optimale ou jusqu'à épuisement du temps imparti. Leur intérêt est de garantir, lorsqu'elles aboutissent, l'optimalité de la solution au regard de la fonction objectif choisie ; leur limite est la croissance du temps de résolution avec la taille de l'instance.

#### 1.4.2. Métaheuristiques

Face aux limites de temps des méthodes exactes sur les grandes instances, une large partie des travaux publiés recourt à des métaheuristiques : recuit simulé, recherche tabou, algorithmes génétiques, colonies de fourmis (Burke et Petrovic, 2002). Ces méthodes partent généralement d'une solution admissible ou partiellement admissible, puis l'améliorent par des mouvements locaux (échange de deux cours, déplacement d'un cours vers un autre créneau) guidés par une fonction de coût qui pénalise les violations de contraintes. Elles offrent un bon compromis entre qualité de solution et temps de calcul sur de grandes instances, au prix d'une garantie d'optimalité perdue et d'un réglage de paramètres souvent délicat.

#### 1.4.3. Satisfaction de contraintes et heuristiques constructives

Le problème d'emploi du temps peut également être formulé comme un problème de satisfaction de contraintes (CSP) : un ensemble de variables (une par activité à placer), chacune associée à un domaine de valeurs possibles (les couples salle/créneau admissibles), sous un ensemble de contraintes reliant ces variables. La résolution procède alors par construction progressive de l'affectation, complétée par un mécanisme de retour arrière (*backtracking*) lorsqu'une impasse est atteinte. L'efficacité de cette construction dépend fortement de l'ordre dans lequel les variables sont traitées ; l'heuristique dite MRV (*Minimum Remaining Values*), qui consiste à affecter en priorité la variable dont le domaine de valeurs restantes est le plus réduit, est l'une des plus employées pour cela, car elle permet de détecter au plus tôt les échecs et de réduire l'ampleur du retour arrière (Russell et Norvig, 2020).

#### 1.4.4. Solveurs modernes de programmation par contraintes

Les deux traditions précédentes — programmation mathématique et satisfaction de contraintes — ont progressivement convergé dans des solveurs hybrides dits de *programmation par contraintes* (CP), qui combinent propagation de contraintes, relaxation linéaire et recherche arborescente. CP-SAT, le solveur de la bibliothèque libre OR-Tools développée par Google, en est une implémentation représentative : il associe un moteur de satisfiabilité booléenne (SAT) à des techniques de programmation par contraintes et de programmation linéaire, ce qui lui permet de traiter efficacement de larges problèmes d'ordonnancement et d'affectation sous contraintes, tout en conservant la possibilité d'exprimer une fonction objectif à optimiser (Google, 2026). C'est ce solveur qui est retenu pour ChronoFS, pour les raisons développées au chapitre suivant.

### 1.5. Outils existants de génération d'emplois du temps

Plusieurs logiciels, commerciaux ou libres, permettent aujourd'hui la génération automatisée d'emplois du temps en milieu scolaire ou universitaire : des solutions propriétaires destinées aux grands établissements, jusqu'à des outils libres plus généralistes conçus pour les établissements secondaires et les petites structures universitaires. Ces outils partagent un socle commun — modélisation des ressources (salles, enseignants, classes), moteur de résolution sous contraintes, interface de saisie et d'édition manuelle — mais restent le plus souvent conçus pour un établissement mono-site, avec un paramétrage générique peu adapté aux contraintes propres d'un établissement précis (répartition géographique, règles locales d'attribution de salle, filières à effectifs très hétérogènes). C'est cet écart entre l'outil générique et le contexte local qui justifie, dans bien des cas, le développement d'une solution sur mesure plutôt que l'adoption d'un produit existant.

### 1.6. Synthèse et positionnement de ChronoFS

Il ressort de cette revue que la résolution du problème d'emploi du temps universitaire est, d'une part, un problème théoriquement difficile (NP-complet), et, d'autre part, un problème dont la formulation concrète varie sensiblement d'un établissement à l'autre en fonction de ses contraintes propres. À la FS-UEB, ces contraintes propres comportent une dimension rarement traitée dans la littérature généraliste : la répartition de la Faculté sur deux campus distants (Ébolowa et Monatélé), qui interdit qu'un enseignant ou qu'une classe change de campus au cours d'une même journée, ainsi que l'existence de salles à vocation exclusive (terrain, laboratoire) réservées à certaines pratiques pédagogiques.

ChronoFS se positionne à l'intersection de la satisfaction de contraintes et de la programmation par contraintes moderne : le problème est modélisé comme un ensemble de variables booléennes soumises à des contraintes dures (au sens de la section 1.4.3), puis confié à un solveur CP-SAT (section 1.4.4) chargé d'en optimiser une fonction objectif lexicographique. Cette approche hybride, détaillée au chapitre 2, permet de bénéficier à la fois de l'expressivité de la modélisation par contraintes et de l'efficacité pratique d'un solveur industriel éprouvé, tout en intégrant nativement les règles propres à la Faculté que ne prévoient pas les outils génériques recensés en 1.5.

### 1.7. Conclusion du chapitre

Ce chapitre a mis en évidence la nature combinatoire et NP-complète du problème d'emploi du temps universitaire, ainsi que les trois grandes familles de méthodes développées pour le traiter : les approches exactes de recherche opérationnelle, les métaheuristiques et les méthodes de satisfaction de contraintes, dont relève l'approche retenue pour ChronoFS. Le chapitre suivant précise le cadre de l'étude, la modélisation détaillée du problème propre à la FS-UEB et l'architecture logicielle mise en œuvre pour le résoudre.

---

## CHAPITRE 2 — MATÉRIEL ET MÉTHODES

### 2.1. Introduction

Ce chapitre présente le cadre dans lequel s'inscrit le travail, la modélisation retenue pour le problème de planification de la FS-UEB, la démarche de conception suivie ainsi que l'architecture logicielle et les technologies mobilisées pour la réalisation de ChronoFS.

### 2.2. Cadre de l'étude

La Faculté des Sciences de l'Université d'Ébolowa (FS-UEB) organise ses enseignements sur deux campus distants, à Ébolowa (site principal) et à Monatélé, répartis en six départements : Technologies de l'Information et de la Communication (TIC), Physique Appliquée (PA), Chimie Appliquée (CA), Sciences Biologiques et Agronomie Appliquée (SBAA), Sciences Biomédicales (SBM) et Recherche Opérationnelle, Statistique et Économétrie (ROSE). Chaque département regroupe plusieurs filières, elles-mêmes réparties en niveaux (Licence 1 à Master 2), aux effectifs très inégaux. Le parc de salles disponibles est tout aussi hétérogène : de petits bureaux d'une quinzaine de places jusqu'à un amphithéâtre de plus de deux cents places, en passant par des salles à vocation spécifique — un laboratoire de chimie et un terrain réservés aux travaux pratiques du département SBAA.

Avant ChronoFS, l'élaboration de l'emploi du temps hebdomadaire reposait sur des tableurs renseignés manuellement par chaque chef de département, centralisés puis arbitrés par la Division des Affaires Académiques et de la Recherche (DAR), qui devait détecter à la main les conflits de salle, d'enseignant ou de classe. C'est ce processus que ChronoFS automatise, sans en changer les acteurs : la DAR conserve la responsabilité de la génération et de la publication du planning, les chefs de département conservent celle de la déclaration des besoins de leur département.

### 2.3. Modélisation du problème de planification

#### 2.3.1. Objets du domaine

Le problème est modélisé autour des entités suivantes, représentées schématiquement dans le diagramme de classes (figure 1) : un **Campus** (Ébolowa ou Monatélé) regroupe des **Salles**, chacune caractérisée par sa capacité et son type ; un **Département** regroupe des **Filières**, elles-mêmes réparties en **Niveaux**, chaque niveau portant son propre effectif ; chaque niveau propose des **Unités d'Enseignement (UE)**, assurées par des **Enseignants** pouvant appartenir à plusieurs départements ; une **DemandeCours**, déposée par un chef de département, précise le jour, le créneau, le type de cours (CM, TD, TP) et l'effectif attendu pour une UE donnée ; le solveur transforme chaque demande retenue en une **Séance**, rattachée à une **Semaine** de planification dont le statut (collecte, imports clôturés, généré, publié, archivé) trace l'avancement du cycle hebdomadaire.

![FIGURE:classes.png|Diagramme de classes du domaine ChronoFS]

#### 2.3.2. Contraintes dures

Le chef de département impose, dans son fichier d'import, le jour et le créneau de chaque cours ; le solveur n'a la charge que de choisir la salle. Neuf contraintes dures encadrent ce choix et ne souffrent aucune exception :

![TABLECAPTION:Contraintes dures du problème de planification ChronoFS]

| Code | Contrainte |
|---|---|
| H1 | Une demande de cours ne reçoit au plus qu'une seule salle |
| H2 | Une salle n'accueille qu'un seul cours par (jour, créneau) |
| H3 | Un enseignant n'assure qu'un seul cours par (jour, créneau) |
| H4 | Une filière (classe) ne suit qu'un seul cours par (jour, créneau) |
| H5 | La capacité de la salle est respectée, avec une tolérance de sur-effectif de 40 % au plus, en dernier recours |
| H6 | Le type de salle est compatible avec le type de cours (cas particulier des salles spéciales, cf. 2.3.4) |
| H7 | La ville de la salle correspond à la ville de la filière |
| H7bis | Le campus imposé par une demande de cours (le cas échéant) est respecté |
| H8 | Un même enseignant n'enseigne que dans une seule ville par jour |
| H9 | Une même filière reste dans un seul campus pour toute la semaine |

Les contraintes H8 et H9 traduisent directement la spécificité géographique de la FS-UEB relevée au chapitre 1 : elles interdisent tout aller-retour d'un enseignant ou d'une classe entre les deux campus, y compris lorsque l'écart entre deux créneaux le permettrait en théorie.

#### 2.3.3. Fonction objectif et contraintes souples

Une fois les contraintes dures respectées, plusieurs solutions restent en général possibles. Le solveur les départage à l'aide d'une fonction objectif lexicographique, c'est-à-dire une hiérarchie stricte de priorités où un critère n'est arbitré qu'à égalité sur tous les critères qui le précèdent : premièrement, maximiser le nombre total de cours effectivement placés ; deuxièmement, donner la priorité aux enseignants vacataires, dont la disponibilité est la plus contrainte ; troisièmement, répartir équitablement l'effort de placement entre filières, en sacrifiant en priorité les filières déjà les mieux servies en cas d'arbitrage ; quatrièmement, minimiser le nombre de salles distinctes utilisées par une même filière au cours de la semaine, afin qu'une classe conserve autant que possible la même salle d'un créneau à l'autre ; cinquièmement, ajuster la capacité de la salle à l'effectif réel du cours, afin de limiter à la fois le gaspillage de places et le recours au forçage de sur-effectif.

#### 2.3.4. Attribution des salles et salles spéciales

L'attribution d'une salle tient compte, en priorité, de l'effectif du niveau concerné (et non de l'effectif global de la filière, qui peut regrouper plusieurs niveaux) :

![TABLECAPTION:Règle d'attribution des salles selon l'effectif]

| Effectif | Type de salle |
|---|---|
| ≥ 150 | Amphithéâtre (220 places) |
| 80 – 149 | Grande salle (100 places) |
| 30 – 79 | Salle moyenne (30 à 40 places) |
| 15 – 29 | Salle standard (20 places) |
| ≤ 15 | Bureau (15 places) |

Deux salles échappent à cette logique générale : le terrain et le laboratoire, réservés aux seuls travaux pratiques du département SBAA. Un TP dont l'intitulé de l'UE contient le mot « chimie » est dirigé vers le laboratoire, à raison d'une filière par créneau ; tout autre TP de ce département (pratique agricole notamment) est dirigé vers le terrain, dont la capacité n'est pas limitée et qui peut accueillir plusieurs filières SBAA simultanément. Toute autre activité — y compris les TP des autres départements — en est exclue par construction.

#### 2.3.5. Plages horaires

Les cours de la Faculté se répartissent en quatre plages horaires fixes, journalières et identiques du lundi au samedi :

![TABLECAPTION:Plages horaires hebdomadaires de la FS-UEB]

| Plage | Horaires |
|---|---|
| C0 | 07h30 – 10h00 |
| C1 | 10h15 – 12h45 |
| C2 | 13h00 – 15h30 |
| C3 | 15h45 – 18h15 |

### 2.4. Démarche de conception

La conception de ChronoFS a suivi une démarche itérative, structurée autour de la modélisation UML du domaine avant l'implémentation logicielle. Le diagramme de cas d'utilisation (figure 2) identifie deux acteurs principaux — la DAR, qui administre le référentiel et pilote le cycle de génération, et le chef de département, qui déclare les besoins de son département — ainsi que les fonctionnalités auxquelles chacun accède. Le diagramme d'activité (figure 3) retrace le déroulement complet d'une semaine de planification, de la création de la semaine par la DAR jusqu'à l'export des documents officiels, en passant par la collecte des imports, la génération automatique, l'ajustement manuel des cours non placés et la publication. Le diagramme de séquence (figure 4) détaille l'échange entre l'interface, l'API, le service de génération, le solveur CP-SAT et la base de données lors du déclenchement d'une génération.

![FIGURE:usecase.png|Diagramme de cas d'utilisation de ChronoFS]

![FIGURE:activite_workflow.png|Diagramme d'activité du cycle hebdomadaire de planification]

![FIGURE:sequence_generation.png|Diagramme de séquence de la génération automatique d'un planning]

### 2.5. Architecture logicielle

ChronoFS repose sur une architecture à trois niveaux (figure 5) : un client web de type application web progressive (PWA), un serveur applicatif exposant une API REST et hébergeant le moteur de résolution, et une base de données relationnelle. Le poste client communique avec le serveur exclusivement en HTTPS/JSON. Côté serveur, l'API REST authentifie les requêtes par jeton JWT, orchestre le moteur de planification et la génération de documents, et persiste l'ensemble des données via un mapping objet-relationnel (ORM). Cette séparation en couches isole la logique métier (règles de planification, contraintes) de la présentation (interface utilisateur) et du stockage, ce qui facilite l'évolution indépendante de chacune de ces couches.

![FIGURE:architecture.png|Architecture logicielle de ChronoFS]

### 2.6. Choix technologiques

![TABLECAPTION:Stack technologique de ChronoFS]

| Couche | Technologie retenue |
|---|---|
| Interface utilisateur | React 18, Vite, Tailwind CSS, framer-motion, zustand, @dnd-kit |
| API et logique métier | Django 5.1, Django REST Framework, djangorestframework-simplejwt |
| Moteur de résolution | OR-Tools (solveur CP-SAT) |
| Génération de documents | openpyxl (Excel), WeasyPrint (PDF), python-docx (Word) |
| Base de données | PostgreSQL |
| Distribution | Progressive Web App (vite-plugin-pwa) |

Le choix de Django REST Framework répond au besoin d'une API structurée et rapide à mettre en œuvre pour un ensemble de ressources fortement relationnelles (campus, salles, filières, enseignants, UE) ; celui de React et de Tailwind CSS répond au besoin d'une interface réactive, où l'édition manuelle d'un planning (glisser-déposer d'une séance, par exemple) exige une expérience fluide. Le choix d'OR-Tools CP-SAT, justifié au chapitre 1, tient à sa capacité à traiter un grand nombre de contraintes combinatoires en un temps d'exécution compatible avec un usage interactif (quelques secondes pour une semaine complète de planification).

### 2.7. Algorithme de génération

Le moteur de planification (module `core/scheduling/solver.py`) reçoit, pour une semaine donnée, l'ensemble des demandes de cours déposées par les chefs de département, le référentiel des salles disponibles et les indisponibilités déclarées des enseignants. Pour chaque demande, une variable booléenne est créée pour chaque salle candidate ; les contraintes dures H1 à H9 (2.3.2) sont posées sur cet ensemble de variables, puis la fonction objectif lexicographique (2.3.3) guide le solveur CP-SAT vers la meilleure solution admissible dans le temps imparti. À l'issue de la résolution, les cours effectivement placés sont matérialisés en base sous forme de séances ; les cours qui n'ont pu être placés sont renvoyés avec une raison exprimée en langage naturel (salle indisponible, conflit non résolu, capacité insuffisante) plutôt qu'un simple constat d'échec du solveur, afin de rester exploitables par la DAR.

### 2.8. Méthodes de collecte et de traitement des données

La collecte des besoins suit un cycle hebdomadaire piloté par la DAR : création de la semaine de planification, ouverture des imports, dépôt par chaque chef de département d'un fichier Excel pré-rempli avec les UE et enseignants de son département, validation de ce fichier avec production d'un rapport d'import signalant les lignes erronées, clôture des imports, génération automatique, ajustement manuel des cours non placés si nécessaire, puis publication du planning et export des documents officiels aux formats PDF, Excel et Word (figure 3). Ce cycle, entièrement tracé par le statut de la semaine de planification, remplace les échanges informels par courriel ou sur tableur qui caractérisaient le processus manuel antérieur.

### 2.9. Conclusion du chapitre

Ce chapitre a détaillé la modélisation retenue pour le problème de planification propre à la FS-UEB — en particulier ses contraintes géographiques inter-campus —, ainsi que l'architecture logicielle et les choix technologiques mis en œuvre pour la résoudre au moyen d'un solveur de programmation par contraintes. Le chapitre suivant présente les résultats obtenus et les discute au regard des objectifs fixés en introduction.

---

## CHAPITRE 3 — RÉSULTATS ET DISCUSSION

### 3.1. Introduction

Ce chapitre présente l'application ChronoFS telle que réalisée, les résultats obtenus lors de la génération de plannings sur des données réelles de la Faculté, puis discute ces résultats au regard des objectifs spécifiques énoncés en introduction.

### 3.2. Présentation de l'application réalisée

#### 3.2.1. Espace public

La page d'accueil publique (figure 6) présente ChronoFS et un aperçu, à titre illustratif, d'une semaine planifiée « sans conflit ». Elle donne accès à l'authentification, seule voie d'entrée vers les espaces DAR et chef de département, aucune fonctionnalité de gestion n'étant accessible sans connexion.

![FIGURE:app_landing.png|Page d'accueil publique de ChronoFS]

#### 3.2.2. Espace de la Division des Affaires Académiques et de la Recherche

Le tableau de bord de la DAR (figure 7) centralise les indicateurs de suivi : nombre de semaines enregistrées dans le système, nombre de départements, d'enseignants et de salles répertoriés, ainsi que la capacité d'accueil cumulée par campus. Sur les données réelles saisies pour la Faculté, ce tableau de bord recense 6 départements, 37 enseignants et 22 salles, pour une capacité d'accueil cumulée de 1 330 places sur le site principal d'Ébolowa et de 1 160 places à Monatélé.

![FIGURE:app_dar_dashboard.png|Tableau de bord de la Division des Affaires Académiques et de la Recherche]

L'écran de planning (figure 8) matérialise le cycle hebdomadaire décrit au chapitre 2 sous la forme d'une barre de progression en quatre étapes (imports, génération, publication, export). Pour la semaine du 15 au 20 juin 2026, prise comme illustration, l'application a généré 254 séances réparties du lundi au samedi sur les quatre plages horaires et l'ensemble des salles des deux campus, et a signalé un cours qui n'avait pu être initialement programmé, en proposant trois créneaux libres où le replacer — proposition que la DAR peut appliquer d'un simple clic.

![FIGURE:app_dar_planning.png|Écran de gestion du planning hebdomadaire (espace DAR)]

#### 3.2.3. Espace chef de département

Le chef de département dispose d'un espace restreint à son propre périmètre (figure 9) : téléchargement du modèle Excel pré-rempli avec les UE et enseignants de son département, dépôt du fichier renseigné, consultation du rapport d'import, de l'historique de ses dépôts et du planning publié une fois la semaine finalisée par la DAR.

![FIGURE:app_chef_import.png|Écran d'import des besoins hebdomadaires (espace chef de département)]

### 3.3. Résultats de la génération automatique

Sur le jeu de données réel de la Faculté (6 départements, 37 enseignants, 22 salles réparties sur les deux campus), la génération d'une semaine de cours complète — plusieurs centaines de demandes de cours réparties sur les deux campus — s'exécute en quelques secondes et respecte, par construction, l'ensemble des contraintes dures énoncées en 2.3.2 : absence de conflit de salle, d'enseignant ou de classe, respect des capacités de salle et des règles de campus. Sur la semaine prise comme illustration, la quasi-totalité des cours déposés a pu être placée dès la première génération ; le seul cours non placé automatiquement l'a été faute de créneau libre correspondant à ses contraintes initiales, et non par une limite du solveur — le mécanisme de récupération de créneaux (3.2.2) lui a d'ailleurs immédiatement proposé trois solutions de repli.

### 3.4. Discussion

Rapportés aux objectifs spécifiques fixés en introduction, ces résultats appellent les observations suivantes.

La **modélisation du problème**, distinguant contraintes dures et souples, s'est révélée capable d'exprimer aussi bien les règles universelles d'un emploi du temps (absence de conflit) que les règles propres à la FS-UEB (répartition inter-campus, salles spéciales), sans recourir à des cas particuliers codés en dur dans l'interface : l'ensemble de ces règles est centralisé dans le solveur et le référentiel de contraintes.

L'**architecture logicielle** en trois niveaux a permis de faire évoluer indépendamment l'interface (React) et le moteur de résolution (OR-Tools) au cours du développement, sans remise en cause du modèle de données.

Le **moteur de résolution sous contraintes** atteint l'objectif d'automatisation recherché : là où l'ajustement manuel d'un conflit obligeait auparavant à reprendre une grille entière, la régénération automatique recalcule une solution complète en quelques secondes.

Les **espaces de travail différenciés** (DAR, chef de département) reproduisent la répartition des responsabilités déjà en vigueur avant l'informatisation, ce qui limite la conduite du changement nécessaire à l'adoption de l'outil.

La **génération de documents officiels** (PDF, Excel, Word) évite la ressaisie manuelle des plannings dans les formats attendus par l'administration.

Ce travail présente cependant des limites. D'abord, la qualité de la planification reste dépendante de la qualité des fichiers Excel déposés par les chefs de département : une UE mal renseignée ou un enseignant mal identifié à l'import se traduit par une contrainte mal posée, que le solveur respectera à la lettre sans pouvoir en questionner la pertinence. Ensuite, le référentiel actuel ne compte qu'un seul laboratoire, situé à Ébolowa, ce qui limite structurellement les travaux pratiques de chimie qui pourraient être programmés à Monatélé. Enfin, si le temps de résolution observé reste compatible avec un usage interactif sur les volumes actuels de la Faculté, sa tenue sur un établissement sensiblement plus grand n'a pas été mesurée et resterait à vérifier.

### 3.5. Conclusion du chapitre

Les résultats obtenus montrent que ChronoFS atteint, sur les données réelles de la Faculté, l'objectif d'une génération automatique de plannings sans conflit, dans un temps compatible avec une utilisation hebdomadaire par la DAR. Les limites identifiées — dépendance à la qualité des imports, référentiel de salles spéciales encore restreint, passage à l'échelle non mesuré — ouvrent les perspectives développées en conclusion générale.

---

## CONCLUSION GÉNÉRALE, PERSPECTIVES ET RECOMMANDATIONS

Ce travail est parti d'un constat simple : la construction, chaque semaine, d'un emploi du temps sans conflit pour une faculté répartie sur deux campus repose encore, dans bien des établissements, sur un travail manuel long et peu reproductible. Il s'est donné pour objectif principal de concevoir et réaliser une application web, ChronoFS, dédiée à la génération automatique des emplois du temps hebdomadaires de la FS-UEB.

Les objectifs spécifiques énoncés en introduction ont été atteints. Le problème de planification propre à la Faculté a été modélisé avec précision, en distinguant neuf contraintes dures — dont deux, relatives à la répartition entre les campus d'Ébolowa et de Monatélé, traduisent une spécificité peu documentée dans la littérature généraliste — d'une fonction objectif lexicographique traitant les critères de qualité souhaitables. Une architecture logicielle à trois niveaux, séparant clairement interface, logique métier et stockage, a été conçue et implémentée. Un moteur de résolution sous contraintes, fondé sur le solveur CP-SAT d'OR-Tools, a été intégré et affecte à chaque cours une salle appropriée en quelques secondes. Des espaces de travail dédiés ont été livrés pour la Division des Affaires Académiques et de la Recherche comme pour les chefs de département, reproduisant la répartition des responsabilités existante. Enfin, l'application génère, à partir des plannings validés, des documents conformes aux formats officiels attendus par l'établissement (PDF, Excel, Word).

Ce travail comporte des limites, déjà relevées au chapitre 3 : une dépendance à la qualité des données saisies par les chefs de département, un référentiel de salles spéciales encore restreint à un seul laboratoire, et un passage à l'échelle qui n'a pas été mesuré au-delà du volume actuel de la Faculté. Plusieurs perspectives s'en dégagent naturellement pour des travaux futurs : l'ajout de mécanismes de validation sémantique des fichiers importés, au-delà des seuls contrôles de format ; l'extension du référentiel de salles spéciales à mesure que la Faculté en ouvrira de nouvelles ; une évaluation systématique du temps de résolution sur des instances de taille croissante, afin d'anticiper une éventuelle extension à d'autres facultés de l'Université d'Ébolowa ; et, plus généralement, l'intégration progressive de la planification des examens et des rattrapages dans le même moteur de résolution, au-delà des plannings de cours qui ont fait l'objet de ce travail.

---

## RÉFÉRENCES BIBLIOGRAPHIQUES

Babaei H, Karimpour J, Hadidi A, 2015. A survey of approaches for university course timetabling problem. Computers & Industrial Engineering, 86, 43-59.

Burke EK, Petrovic S, 2002. Recent research directions in automated timetabling. European Journal of Operational Research, 140(2), 266-280.

de Werra D, 1985. An introduction to timetabling. European Journal of Operational Research, 19(2), 151-162.

Django Software Foundation, 2026. Django Documentation. https://docs.djangoproject.com (consulté en juillet 2026).

Even S, Itai A, Shamir A, 1976. On the complexity of timetable and multicommodity flow problems. SIAM Journal on Computing, 5(4), 691-703.

Google, 2026. OR-Tools CP-SAT Solver — Documentation. https://developers.google.com/optimization/cp/cp_solver (consulté en juillet 2026).

PostgreSQL Global Development Group, 2026. PostgreSQL Documentation. https://www.postgresql.org/docs/ (consulté en juillet 2026).

Russell S, Norvig P, 2020. Artificial Intelligence: A Modern Approach, 4th ed. Pearson Ed., Harlow (Royaume-Uni), 1136 p.
