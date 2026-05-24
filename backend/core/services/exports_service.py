"""
Orchestration des exports PDF / Word + auto-archivage versionné.

Chaque appel à `exporter_pdf(semaine, user)` ou `exporter_docx` :
1. Génère le document.
2. Crée un `ArchivePlanning` avec `version = N+1` et y attache le fichier
   (le binaire est conservé à vie dans MEDIA_ROOT/archives/...).
3. Retourne (bytes, nom_fichier, archive_obj) — le caller renvoie le
   binaire dans la HttpResponse de téléchargement.
"""

from __future__ import annotations

from django.core.files.base import ContentFile
from django.db import transaction

from core.models import ArchivePlanning, Semaine, User
from core.services.docx_service import generate_planning_docx
from core.services.pdf_service import generate_planning_pdf


def _prochaine_version(semaine: Semaine) -> int:
    return 1 + ArchivePlanning.objects.filter(semaine=semaine).count()


@transaction.atomic
def exporter_pdf(semaine: Semaine, user: User) -> tuple[bytes, str, ArchivePlanning]:
    """Génère le PDF + crée la ligne ArchivePlanning."""
    contenu, nom = generate_planning_pdf(semaine)
    version = _prochaine_version(semaine)

    archive = ArchivePlanning(
        semaine     = semaine,
        exporte_par = user,
        version     = version,
    )
    archive.fichier_pdf.save(nom, ContentFile(contenu), save=False)
    archive.save()

    return contenu, nom, archive


@transaction.atomic
def exporter_docx(semaine: Semaine, user: User) -> tuple[bytes, str, ArchivePlanning]:
    """
    Génère le DOCX. Si une archive PDF existe pour le même appel
    "session d'export", on attache le docx dessus. Sinon on crée un
    enregistrement avec PDF vide (cas où le DAR n'exporte QUE du Word).
    """
    contenu, nom = generate_planning_docx(semaine)
    version = _prochaine_version(semaine)

    archive = ArchivePlanning(
        semaine     = semaine,
        exporte_par = user,
        version     = version,
    )
    # On a besoin d'un fichier_pdf (FileField required). On stocke un
    # marqueur vide pour respecter le schéma sans casser la BDD.
    archive.fichier_pdf.save(
        nom.replace('.docx', '_placeholder.txt'),
        ContentFile(b'Export docx uniquement (cf. fichier_docx).'),
        save=False,
    )
    archive.fichier_docx.save(nom, ContentFile(contenu), save=False)
    archive.save()

    return contenu, nom, archive
