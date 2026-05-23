# ChronoFS — Contexte du projet

## Identité
- Développeur : TCHAMBA NJILO FERDINAND
- Niveau : Licence TIC – Informatique L3
- Université : Université d'Ebolowa (UEB)
- Faculté : Faculté des Sciences
- Encadreurs : Dr. Kengni Olga + Dr. Nyabeye (Dpt. TIC)

## Projet
- Nom : ChronoFS
- But : Logiciel de gestion des emplois du temps de la FS-UEB
- Soutenance : Juin 2026

## Stack technique
- Frontend : React.js + Vite + Tailwind CSS
- Backend : Django + Django REST Framework
- Base de données : PostgreSQL
- OS développement : Kali Linux (username: neo)
- Chemin projet : ~/Bureau/ChronoFS

## État d'avancement
- [x] PostgreSQL installé et configuré (DB: chronofs_db, USER: chronofs_admin)
- [x] Django créé et migré
- [x] React/Vite créé et tourne sur http://localhost:5173
- [ ] Tailwind CSS à configurer
- [ ] Modèles Django à créer
- [ ] Interface React à construire

## Applications Django créées
- salles, filieres, enseignants, matieres, plannings, emplois

## Salles UEB
- Salle E : ~220 places (fusion C+E) — seule grande salle
- Salles A, B : ~100 places chacune
- Salles M, N : ~30-40 places
- Salles D,F,G,H,I,J,K,L : ~20 places
- 2 Bureaux : ~15 places
- Campus encore en construction

## Profils prévus (version 1)
- Administrateur uniquement (Dr. Tchinda)
- Profil prof et public = version future

## Contraintes algorithme
- Un prof peut enseigner dans différents départements
- Conflit seulement si même prof, même créneau, même heure
- Attribution salle selon effectif décroissant
- Plages horaires UEB : 7h30-10h00, 10h15-12h45,
  13h00-15h30, 15h45-18h15 (avec pauses entre)