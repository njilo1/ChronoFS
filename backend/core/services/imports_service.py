"""
Service Imports — workflow de dépôt et de versionnage.

Règle d'or : on n'ÉCRASE jamais un envoi précédent. Si un
`ImportPlanning` existe déjà pour (semaine, departement), on le déplace
dans `ImportPlanningHistorique` avec un numéro de version incrémenté,
puis on crée le nouvel actif.

Tout est transactionnel : si une étape échoue, on rollback intégralement.
"""

from __future__ import annotations

from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone

from core.constants import StatutParsing
from core.models import (
    Departement,
    DemandeCours,
    ImportPlanning,
    ImportPlanningHistorique,
    Semaine,
    User,
)
from core.services.excel_service import RapportParsing


@transaction.atomic
def confirmer_import(
    *,
    user: User,
    semaine: Semaine,
    departement: Departement,
    fichier_nom: str,
    fichier_bytes: bytes,
    rapport: RapportParsing,
) -> ImportPlanning:
    """
    Enregistre un nouvel `ImportPlanning` à partir d'un rapport de parsing.

    - Versionne l'ancien import s'il existe (le déplace dans l'historique).
    - Sauve le fichier reçu sur disque (MEDIA_ROOT/imports/...).
    - Crée les `DemandeCours` correspondant aux lignes valides.
    - Marque le statut selon le rapport (OK, AVEC_ERREURS).
    """
    # ── 1. Versionnage de l'éventuel ancien ──────────────────────────────────
    ancien = (
        ImportPlanning.objects
        .filter(semaine=semaine, departement=departement)
        .first()
    )
    if ancien:
        _archiver_dans_historique(ancien)
        # ancien est maintenant supprimé de la table active

    # ── 2. Création du nouvel import actif ───────────────────────────────────
    nouveau = ImportPlanning(
        semaine=semaine,
        departement=departement,
        uploaded_by=user,
        statut_parsing=(
            StatutParsing.OK
            if rapport.ok and rapport.lignes_erreur == 0
            else StatutParsing.AVEC_ERREURS
        ),
        rapport_parsing=rapport.to_json(),
    )
    nouveau.fichier.save(fichier_nom, ContentFile(fichier_bytes), save=False)
    nouveau.save()

    # ── 3. Créer les DemandeCours ────────────────────────────────────────────
    DemandeCours.objects.bulk_create([
        DemandeCours(
            import_source    = nouveau,
            filiere_id       = ligne.filiere_id,
            ue_id            = ligne.ue_id,
            enseignant_id    = ligne.enseignant_id,
            effectif_declare = ligne.effectif_declare,
            jour             = ligne.jour,
            creneau          = ligne.creneau,
            type_cours       = ligne.type_cours,
            observations     = ligne.observations,
        )
        for ligne in rapport.lignes_valides
    ])

    return nouveau


def _archiver_dans_historique(import_actif: ImportPlanning):
    """
    Copie l'import dans `ImportPlanningHistorique` puis le supprime.

    Le FileField est dupliqué (les anciens uploads doivent rester
    accessibles à vie même si le actif est remplacé).
    """
    # Numéro de version : v(n+1) où n = max historique courant + 1 si le
    # courant existe (le actif n'a pas de version).
    prochaine_version = 1 + (
        ImportPlanningHistorique.objects
        .filter(semaine=import_actif.semaine, departement=import_actif.departement)
        .count()
    )

    # On rouvre le fichier en lecture (binaire) pour le recopier sur le
    # nouveau path d'archive (upload_to='imports/archives/...').
    contenu = b''
    if import_actif.fichier and import_actif.fichier.name:
        try:
            with import_actif.fichier.open('rb') as f:
                contenu = f.read()
        except FileNotFoundError:
            # Fichier disparu du disque (cas dégradé) — on archive quand
            # même l'enregistrement, mais sans fichier.
            contenu = b''

    historique = ImportPlanningHistorique(
        semaine     = import_actif.semaine,
        departement = import_actif.departement,
        uploaded_by = import_actif.uploaded_by,
        uploaded_at = import_actif.uploaded_at,
        version     = prochaine_version,
    )
    if contenu:
        nom_original = import_actif.fichier.name.split('/')[-1]
        historique.fichier.save(
            f'v{prochaine_version}_{nom_original}',
            ContentFile(contenu),
            save=False,
        )
    historique.save()

    # Supprimer l'actif (cascade supprime aussi les DemandeCours rattachées)
    import_actif.delete()
