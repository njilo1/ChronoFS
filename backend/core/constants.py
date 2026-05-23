"""
Constantes métier FSChrono v2.

Tout ce qui est fixe par règlement UEB est centralisé ici pour qu'aucun
calcul dynamique ne dérape : créneaux horaires officiels, jours ouvrés
(lundi → samedi, pas de cours le dimanche), villes, choix communs aux
modèles et au solver.

Référence : CLAUDE.md — règles métier critiques.
"""

from django.db import models


# ── Géographie ───────────────────────────────────────────────────────────────
class Ville(models.TextChoices):
    """Les deux villes d'implantation de la FS-UEB."""

    EBOLOWA  = 'EBOLOWA',  'Ébolowa'
    MONATELE = 'MONATELE', 'Monatélé'


# ── Niveaux pédagogiques ─────────────────────────────────────────────────────
class Niveau(models.TextChoices):
    L1 = 'L1', 'Licence 1'
    L2 = 'L2', 'Licence 2'
    L3 = 'L3', 'Licence 3'
    M1 = 'M1', 'Master 1'
    M2 = 'M2', 'Master 2'


# ── Jours ouvrés (cours du lundi au samedi UNIQUEMENT) ───────────────────────
class Jour(models.IntegerChoices):
    """Index 0 = lundi … 5 = samedi. Pas de dimanche."""

    LUNDI    = 0, 'Lundi'
    MARDI    = 1, 'Mardi'
    MERCREDI = 2, 'Mercredi'
    JEUDI    = 3, 'Jeudi'
    VENDREDI = 4, 'Vendredi'
    SAMEDI   = 5, 'Samedi'


# ── Créneaux horaires UEB (FIXES — règlement faculté) ────────────────────────
# Quatre plages de 2h30 séparées par des pauses de 15min.
# Index 0..3 utilisés en BDD pour économiser la place et faciliter le solver.
class Creneau(models.IntegerChoices):
    C0 = 0, '7h30-10h00'
    C1 = 1, '10h15-12h45'
    C2 = 2, '13h00-15h30'
    C3 = 3, '15h45-18h15'


# Horaires bruts associés (utile pour l'affichage et l'export PDF/Excel)
# Tuple : (heure_debut, heure_fin) au format 'HH:MM'.
HORAIRES_CRENEAUX: dict[int, tuple[str, str]] = {
    Creneau.C0: ('07:30', '10:00'),
    Creneau.C1: ('10:15', '12:45'),
    Creneau.C2: ('13:00', '15:30'),
    Creneau.C3: ('15:45', '18:15'),
}


# ── Salles ───────────────────────────────────────────────────────────────────
class TypeSalle(models.TextChoices):
    COURS      = 'COURS',      'Cours classique'
    TP         = 'TP',         'Travaux pratiques'
    MULTIMEDIA = 'MULTIMEDIA', 'Multimédia'
    AMPHI      = 'AMPHI',      'Amphithéâtre'
    TERRAIN    = 'TERRAIN',    'Terrain'
    LABO       = 'LABO',       'Laboratoire'
    BUREAU     = 'BUREAU',     'Bureau'


# ── Cours / séances ──────────────────────────────────────────────────────────
class TypeCours(models.TextChoices):
    CM        = 'CM',        'Cours magistral'
    TD        = 'TD',        'Travaux dirigés'
    TP        = 'TP',        'Travaux pratiques'
    SEMINAIRE = 'SEMINAIRE', 'Séminaire'
    PROJET    = 'PROJET',    'Projet'


# ── Compatibilité TypeCours ↔ TypeSalle ──────────────────────────────────────
# Contrainte H6 du solver : un TP doit se faire dans un labo/multimédia/TP,
# un CM dans une salle de cours ou un amphi, etc. Le TERRAIN est universel
# (sport / activités spéciales) — accepté pour tous les types.
SALLES_AUTORISEES_PAR_TYPE_COURS: dict[str, list[str]] = {
    TypeCours.CM: [
        TypeSalle.COURS, TypeSalle.AMPHI, TypeSalle.MULTIMEDIA,
        TypeSalle.TERRAIN, TypeSalle.BUREAU,
    ],
    TypeCours.TD: [
        TypeSalle.COURS, TypeSalle.AMPHI, TypeSalle.MULTIMEDIA,
        TypeSalle.BUREAU, TypeSalle.TERRAIN,
    ],
    TypeCours.TP: [
        TypeSalle.TP, TypeSalle.MULTIMEDIA, TypeSalle.LABO,
        TypeSalle.TERRAIN,
    ],
    TypeCours.SEMINAIRE: [
        TypeSalle.COURS, TypeSalle.AMPHI, TypeSalle.MULTIMEDIA,
        TypeSalle.TERRAIN, TypeSalle.BUREAU,
    ],
    TypeCours.PROJET: [
        TypeSalle.TP, TypeSalle.MULTIMEDIA, TypeSalle.LABO,
        TypeSalle.COURS, TypeSalle.TERRAIN,
    ],
}


# ── Semestres ────────────────────────────────────────────────────────────────
class Semestre(models.IntegerChoices):
    S1 = 1, 'Semestre 1'
    S2 = 2, 'Semestre 2'


# ── Statuts d'une semaine ────────────────────────────────────────────────────
class StatutSemaine(models.TextChoices):
    DRAFT             = 'DRAFT',             'Brouillon'
    IMPORTS_OUVERTS   = 'IMPORTS_OUVERTS',   'Imports ouverts'
    IMPORTS_CLOTURES  = 'IMPORTS_CLOTURES',  'Imports clôturés'
    GENERE            = 'GENERE',            'Planning généré'
    PUBLIE            = 'PUBLIE',            'Publié'


# ── Statuts de parsing d'un import ───────────────────────────────────────────
class StatutParsing(models.TextChoices):
    EN_ATTENTE = 'EN_ATTENTE', 'En attente'
    EN_COURS   = 'EN_COURS',   'En cours'
    OK         = 'OK',         'Réussi'
    AVEC_ERREURS = 'AVEC_ERREURS', 'Réussi avec erreurs'
    ECHEC      = 'ECHEC',      'Échec'


# ── Rôles utilisateurs (2 seuls) ─────────────────────────────────────────────
class Role(models.TextChoices):
    DAR       = 'DAR',       "Division des Affaires Académiques"
    CHEF_DEPT = 'CHEF_DEPT', 'Chef de département'


# ── Grades enseignants ───────────────────────────────────────────────────────
class Grade(models.TextChoices):
    DR  = 'DR',  'Dr'
    PR  = 'PR',  'Pr'
    M   = 'M',   'M'
    MME = 'MME', 'Mme'
    ING = 'ING', 'Ing'
