"""
Génération du PDF officiel UEB via WeasyPrint.

Reproduit la mise en page des PDF de référence :
  - docs/references/Semaine_du_04_mai_au_10_mai.pdf
  - docs/references/planning Monatélé du 18 mai au 23 mai 2026.pdf

Une page par salle (qui a au moins une séance). Tri des salles :
  Ébolowa : Campus Principal FS → Lycée Classique → Face CRA
  Monatélé : Campus Monatélé
puis ordre alphabétique du nom de salle.

Bloc NB + signature du Doyen sur la dernière page.
"""

from __future__ import annotations

import locale
from datetime import date
from pathlib import Path
from typing import Optional

from django.conf import settings
from django.template.loader import render_to_string
from weasyprint import HTML

from core.constants import HORAIRES_CRENEAUX, Jour
from core.models import Salle, Seance, Semaine


# Active la locale française pour le formatage des dates (%d F Y → "24 mai 2026")
try:
    locale.setlocale(locale.LC_TIME, 'fr_FR.UTF-8')
except locale.Error:
    pass  # OK : Django |date filter gère les noms FR en interne


# ── Ordre canonique des campus pour le tri des pages ────────────────────────
_ORDRE_CAMPUS = {
    'Campus Principal FS': (0, 0),
    'Lycée Classique':     (0, 1),
    'Face CRA':            (0, 2),
    'Campus Monatélé':     (1, 0),
}

def _ordre_salle(salle: Salle) -> tuple:
    """Clé de tri : ville (Éb=0, Mo=1) → rang campus → nom alpha."""
    rang = _ORDRE_CAMPUS.get(salle.campus.nom, (9, 9))
    return rang + (salle.nom,)


# ── Helpers de présentation ──────────────────────────────────────────────────
def _humaniser_horaire(deb: str, fin: str) -> str:
    """ '07:30' / '10:00' → '7h30 - 10h00' """
    def hum(h):
        h, m = h.split(':')
        return f'{int(h)}h{m}'
    return f'{hum(deb)} - {hum(fin)}'


def _construire_cellule(s: Seance) -> dict:
    """Représentation cellule pour le template."""
    return {
        'classe':     f'{s.filiere.nom} {s.filiere.niveau}',
        'code_ue':    s.ue.code,
        'intitule':   s.ue.intitule,
        'enseignant': (
            f'{s.enseignant.get_grade_display()} {s.enseignant.nom}'
            if s.enseignant else '—'
        ),
    }


# ── Point d'entrée public ────────────────────────────────────────────────────
def generate_planning_pdf(semaine: Semaine) -> tuple[bytes, str]:
    """
    Rend le PDF officiel pour la semaine et le renvoie en bytes.

    Returns: (contenu_pdf_bytes, nom_fichier_suggere)
    """
    # ── Charger toutes les séances de la semaine ────────────────────────────
    seances = list(
        Seance.objects
        .filter(semaine=semaine)
        .select_related('filiere', 'ue', 'enseignant', 'salle__campus')
    )

    # Regrouper par salle, calculer matrice jour × créneau
    salles_pleines: list[dict] = []
    salles_utilisees = sorted({s.salle for s in seances}, key=_ordre_salle)

    for salle in salles_utilisees:
        seances_salle = [s for s in seances if s.salle_id == salle.id]
        # Matrice [creneau][jour] → Seance ou None
        matrice: dict[int, dict[int, Optional[Seance]]] = {
            c: {j: None for j in range(6)} for c in range(4)
        }
        for s in seances_salle:
            matrice[s.creneau][s.jour] = s

        # Construit les "lignes" du template (une ligne = un créneau)
        lignes = []
        for creneau_idx in range(4):
            deb, fin = HORAIRES_CRENEAUX[creneau_idx]
            jours_cells = []
            for jour_idx in range(6):
                s = matrice[creneau_idx][jour_idx]
                jours_cells.append(_construire_cellule(s) if s else None)
            lignes.append({
                'horaire': _humaniser_horaire(deb, fin),
                'jours':   jours_cells,
            })

        salles_pleines.append({
            'salle':  salle,
            'lignes': lignes,
        })

    # ── Chemins absolus des assets pour WeasyPrint ──────────────────────────
    assets_dir = Path(settings.BASE_DIR) / 'core' / 'static' / 'exports'
    contexte = {
        'semaine':         semaine,
        'date_emission':   date.today(),
        'jours_libelles':  [j.label for j in Jour],
        'salles_pleines':  salles_pleines,
        'logo_ueb_path':   f'file://{assets_dir / "logo_ueb.png"}',
        'logo_fs_path':    f'file://{assets_dir / "logo_fs.png"}',
        'cachet_path':     f'file://{assets_dir / "cachet_doyen.png"}',
    }

    html_str = render_to_string('exports/planning_pdf.html', contexte)
    pdf_bytes = HTML(string=html_str, base_url=str(assets_dir)).write_pdf()

    nom = (
        f'Planning_FS-UEB_'
        f'{semaine.date_debut:%Y-%m-%d}_au_{semaine.date_fin:%Y-%m-%d}.pdf'
    )
    return pdf_bytes, nom
