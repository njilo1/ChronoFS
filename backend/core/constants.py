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
# Contrainte H6 du solver : un TP « ordinaire » se fait dans un TP/multimédia,
# un CM dans une salle de cours ou un amphi, etc.
#
# Le TERRAIN et le LABO sont des salles SPÉCIALES qui ne sont JAMAIS choisies
# par défaut (un cours de TIC n'a rien à faire sur un terrain). Elles sont
# réservées au seul département SBAA, et uniquement pour ses TP, via la règle
# `salle_speciale_requise()` ci-dessous :
#   • TP SBAA dont l'intitulé contient « chimie » → LABO (1 classe/créneau) ;
#   • autre TP SBAA                               → TERRAIN (plusieurs classes
#                                                   simultanément possibles).
# C'est pourquoi ni TERRAIN ni LABO n'apparaissent dans les listes générales.
SALLES_AUTORISEES_PAR_TYPE_COURS: dict[str, list[str]] = {
    TypeCours.CM: [
        TypeSalle.COURS, TypeSalle.AMPHI, TypeSalle.MULTIMEDIA, TypeSalle.BUREAU,
    ],
    TypeCours.TD: [
        TypeSalle.COURS, TypeSalle.AMPHI, TypeSalle.MULTIMEDIA, TypeSalle.BUREAU,
    ],
    TypeCours.TP: [
        TypeSalle.TP, TypeSalle.MULTIMEDIA,
    ],
    TypeCours.SEMINAIRE: [
        TypeSalle.COURS, TypeSalle.AMPHI, TypeSalle.MULTIMEDIA, TypeSalle.BUREAU,
    ],
    TypeCours.PROJET: [
        TypeSalle.TP, TypeSalle.MULTIMEDIA, TypeSalle.COURS,
    ],
}


# ── Salles spéciales SBAA (terrain / laboratoire) ────────────────────────────
# Seul ce département envoie ses TP au terrain (et au labo pour la chimie).
CODE_DEPARTEMENT_SALLES_SPECIALES = 'SBAA'
# Mot-clé cherché dans l'intitulé de l'UE pour router un TP SBAA vers le labo
# au lieu du terrain (insensible à la casse).
MOT_CLE_LABO = 'chimie'


def salle_speciale_requise(
    code_departement: str | None,
    type_cours: str | None,
    intitule_ue: str | None,
) -> str | None:
    """Type de salle imposé pour les cas spéciaux SBAA, sinon None.

    Renvoie :
        TypeSalle.LABO     → TP SBAA dont l'intitulé contient « chimie » ;
        TypeSalle.TERRAIN  → tout autre TP SBAA ;
        None               → cas ordinaire (salle classique selon
                             SALLES_AUTORISEES_PAR_TYPE_COURS).
    """
    if code_departement != CODE_DEPARTEMENT_SALLES_SPECIALES:
        return None
    if type_cours != TypeCours.TP:
        return None
    if MOT_CLE_LABO in (intitule_ue or '').lower():
        return TypeSalle.LABO
    return TypeSalle.TERRAIN


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


# ── Types de notification (interactions entre acteurs) ───────────────────────
class TypeNotification(models.TextChoices):
    IMPORTS_OUVERTS    = 'IMPORTS_OUVERTS',    'Imports ouverts'
    IMPORTS_CLOTURES   = 'IMPORTS_CLOTURES',   'Imports clôturés'
    PLANNING_PUBLIE    = 'PLANNING_PUBLIE',    'Planning publié'
    PLANNING_RECU      = 'PLANNING_RECU',      'Planning reçu'
    COMPTE_CREE        = 'COMPTE_CREE',        'Compte créé'
    MOT_DE_PASSE_RESET = 'MOT_DE_PASSE_RESET', 'Mot de passe réinitialisé'
    ABSENCE_SIGNALEE   = 'ABSENCE_SIGNALEE',   'Absence signalée'


# ── Grades enseignants ───────────────────────────────────────────────────────
class Grade(models.TextChoices):
    DR  = 'DR',  'Dr'
    PR  = 'PR',  'Pr'
    M   = 'M',   'M'
    MME = 'MME', 'Mme'
    ING = 'ING', 'Ing'


# ── Statut enseignant ────────────────────────────────────────────────────────
# Les vacataires (intervenants extérieurs, disponibilité limitée) sont
# PRIORITAIRES sur les permanents lors de la génération : on s'efforce de
# placer leurs cours d'abord, car ils ont peu de marge pour se reprogrammer.
class StatutEnseignant(models.TextChoices):
    PERMANENT = 'PERMANENT', 'Permanent'
    VACATAIRE = 'VACATAIRE', 'Vacataire'


# ── Tolérance de sur-effectif (forçage de salle) ─────────────────────────────
# Une salle peut accueillir jusqu'à capacite × (1 + TOLERANCE_SURCAPACITE)
# étudiants quand aucune salle idéale n'est libre (ex. une salle de 50 places
# peut monter à ~70). Le solver pénalise ce forçage pour ne l'utiliser qu'en
# dernier recours (cf. objectif S « capacité ≈ effectif »).
TOLERANCE_SURCAPACITE = 0.40
