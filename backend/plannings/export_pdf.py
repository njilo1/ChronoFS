"""
Génération du PDF officiel UEB pour les emplois du temps.
Format bilingue (FR/EN), landscape A4, grille Lundi→Samedi × 4 plages.
"""
from io import BytesIO
from datetime import date
from collections import defaultdict

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import cm, mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle,
    Paragraph, Spacer, PageBreak,
)

from .models import EmploiDuTemps, Creneau, CreneauExamen

# ── Constantes ────────────────────────────────────────────────────────────────

JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
JOURS_LABELS = {
    'lundi': 'Lundi', 'mardi': 'Mardi', 'mercredi': 'Mercredi',
    'jeudi': 'Jeudi', 'vendredi': 'Vendredi', 'samedi': 'Samedi',
}
JOURS_FR = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

PLAGES_COURS = [
    ('07:30', '10:00'),
    ('10:15', '12:45'),
    ('13:00', '15:30'),
    ('15:45', '18:15'),
]
# Alias pour la compatibilité
PLAGES = PLAGES_COURS

PLAGES_EXAMEN = [
    ('07:30', '09:30', '7h30 – 9h30'),
    ('10:00', '12:00', '10h00 – 12h00'),
    ('13:00', '15:00', '13h00 – 15h00'),
    ('15:30', '17:30', '15h30 – 17h30'),
]

MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
           'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

# Palette de couleurs
C_GOLD   = colors.HexColor('#8B6914')
C_HEADER = colors.HexColor('#1C2B38')
C_LIGHT  = colors.HexColor('#FBF7EE')
C_STRIPE = colors.HexColor('#F5F0E8')
C_LINE   = colors.HexColor('#CCBF99')
C_BLACK  = colors.black
C_WHITE  = colors.white
C_GRAY   = colors.HexColor('#888888')
C_DARK   = colors.HexColor('#2A3A48')


def _ps(name, size, bold=False, color=C_BLACK, align=TA_CENTER, leading=None, space_after=0):
    """Raccourci pour créer un ParagraphStyle."""
    return ParagraphStyle(
        name,
        fontName='Helvetica-Bold' if bold else 'Helvetica',
        fontSize=size,
        textColor=color,
        alignment=align,
        leading=leading or max(size * 1.25, size + 2),
        spaceAfter=space_after,
        spaceBefore=0,
    )


def _fmt_date(d):
    if not d:
        return '—'
    return f"{d.day} {MOIS_FR[d.month - 1]} {d.year}"


def _fmt_date_short(d):
    if not d:
        return '—'
    return f"{d.day:02d}/{d.month:02d}/{d.year}"


# ── Fonctions de construction de contenu ─────────────────────────────────────

def _build_header(edt):
    """
    En-tête bilingue 3 colonnes : Français | Zone centrale | Anglais.
    """
    s_fr = _ps('hFR', 8, align=TA_LEFT)
    s_en = _ps('hEN', 8, align=TA_RIGHT)
    s_logo = _ps('logo', 18, bold=True, color=C_GOLD)
    s_sub  = _ps('sub', 7, color=C_GRAY)

    fr_para = Paragraph(
        "<b>REPUBLIQUE DU CAMEROUN</b><br/>"
        "Paix – Travail – Patrie<br/>"
        "—————<br/>"
        "<b>MINISTERE DE L'ENSEIGNEMENT SUPERIEUR</b><br/>"
        "—————<br/>"
        "<b>UNIVERSITE D'EBOLOWA</b><br/>"
        "<b>FACULTE DES SCIENCES</b><br/>"
        "<font size='7'>Direction des Affaires Académiques<br/>"
        "et de la Recherche Scientifique</font>",
        s_fr,
    )

    en_para = Paragraph(
        "<b>REPUBLIC OF CAMEROON</b><br/>"
        "Peace – Work – Fatherland<br/>"
        "—————<br/>"
        "<b>MINISTRY OF HIGHER EDUCATION</b><br/>"
        "—————<br/>"
        "<b>UNIVERSITY OF EBOLOWA</b><br/>"
        "<b>FACULTY OF SCIENCES</b><br/>"
        "<font size='7'>Academic Affairs and Scientific<br/>"
        "Research Directorate</font>",
        s_en,
    )

    center_content = [
        [Paragraph("FS", s_logo)],
        [Paragraph("UEB", _ps('ueb', 10, bold=True, color=C_GOLD))],
        [Paragraph("Faculté des Sciences<br/>University of Ebolowa", s_sub)],
    ]
    inner = Table(center_content, colWidths=['100%'])
    inner.setStyle(TableStyle([
        ('ALIGN',  (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))

    data = [[fr_para, inner, en_para]]
    page_w = landscape(A4)[0] - 2.4 * cm
    t = Table(data, colWidths=[page_w * 0.40, page_w * 0.20, page_w * 0.40])
    t.setStyle(TableStyle([
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('LINEBELOW',     (0, 0), (-1, 0), 0.8, C_GOLD),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING',    (0, 0), (-1, -1), 0),
    ]))
    return t


def _build_meta(edt):
    """Ligne de référence + titre + semaine."""
    content = []

    page_w = landscape(A4)[0] - 2.4 * cm
    ref_data = [[
        Paragraph("N° ……………/UEb/DFS/DAARS", _ps('ref', 7, align=TA_LEFT, color=C_GRAY)),
        Paragraph(f"Ebolowa, le {date.today().strftime('%d/%m/%Y')}", _ps('refR', 7, align=TA_RIGHT, color=C_GRAY)),
    ]]
    ref_t = Table(ref_data, colWidths=[page_w * 0.5, page_w * 0.5])
    content.append(ref_t)
    content.append(Spacer(1, 3 * mm))

    type_labels = {
        'cours':      'PLANNING DES COURS',
        'examen':     'PLANNING DES EXAMENS',
        'rattrapage': 'PLANNING DES RATTRAPAGES',
    }
    titre_txt = type_labels.get(edt.type_planning, 'PLANNING')
    campus_str = edt.campus.nom.upper() if edt.campus else 'EBOLOWA'
    ville_str  = edt.campus.ville.upper() if edt.campus else 'EBOLOWA'

    content.append(Paragraph(
        titre_txt,
        _ps('titre', 14, bold=True, color=C_HEADER),
    ))
    content.append(Spacer(1, 1 * mm))
    content.append(Paragraph(
        f"ANNÉE ACADÉMIQUE {edt.annee_academique}  ·  SEMESTRE {edt.semestre}  ·  "
        f"CAMPUS {campus_str} – {ville_str}",
        _ps('meta', 8.5, color=C_GOLD),
    ))
    content.append(Spacer(1, 1 * mm))
    content.append(Paragraph(
        f"Semaine du {_fmt_date(edt.semaine_debut)} au {_fmt_date(edt.semaine_fin)}",
        _ps('semaine', 8, color=C_GRAY),
    ))
    content.append(Spacer(1, 4 * mm))
    return content


def _build_grid(edt, grid):
    """Grille EDT d'une classe : 7 colonnes (Horaire + 6 jours) × 4 plages.
    La page entière concernant une seule classe, on n'affiche pas la filière
    dans chaque cellule — uniquement code matière, intitulé, enseignant, salle.
    """
    page_w = landscape(A4)[0] - 2.4 * cm
    col_h = 2.0 * cm
    col_j = (page_w - col_h) / 6

    s_th    = _ps('th',  9,   bold=True, color=C_WHITE)
    s_hor   = _ps('hor', 8,   bold=True, color=C_DARK, align=TA_CENTER)
    s_cell  = _ps('cell', 8,  align=TA_LEFT, leading=10)

    def day_header(jour):
        return Paragraph(f"<b>{JOURS_LABELS[jour]}</b>", s_th)

    header_row = [Paragraph('<b>Horaire</b>', s_th)] + [day_header(j) for j in JOURS]

    rows = [header_row]
    row_heights = [0.7 * cm]

    for debut, fin in PLAGES:
        hor_cell = Paragraph(
            f"<b>{debut}</b><br/><font size='6' color='#888888'>à</font><br/><b>{fin}</b>",
            s_hor,
        )
        row = [hor_cell]
        max_n = 1

        for jour in JOURS:
            entries = grid[jour].get(debut, [])
            if not entries:
                row.append('')
                continue

            parts = []
            for c in entries:
                mat = c.matiere
                if mat:
                    m_code = mat.code
                    m_int  = mat.intitule
                    ens    = mat.enseignant
                    ens_str = f"{ens.grade}. {ens.nom}" if ens else ''
                else:
                    m_code = '—'; m_int = ''; ens_str = ''
                salle = c.salle.nom if c.salle else '—'

                int_short = m_int[:32] + ('…' if len(m_int) > 32 else '')

                parts.append(
                    f"<b>{m_code}</b> <font size='7.5'>{int_short}</font><br/>"
                    f"<font size='7' color='#444444'>{ens_str}</font><br/>"
                    f"<font size='7' color='#666666'>Salle {salle}</font>"
                )

            separator = "<br/><font size='3'> </font><br/>"
            cell_para = Paragraph(separator.join(parts), s_cell)
            row.append(cell_para)
            max_n = max(max_n, len(entries))

        rows.append(row)
        row_heights.append(1.8 * cm + (max_n - 1) * 1.4 * cm)

    t = Table(rows, colWidths=[col_h] + [col_j] * 6, rowHeights=row_heights)
    t.setStyle(TableStyle([
        # En-tête
        ('BACKGROUND',    (0, 0), (-1, 0), C_HEADER),
        ('TEXTCOLOR',     (0, 0), (-1, 0), C_WHITE),
        # Colonne horaire
        ('BACKGROUND',    (0, 1), (0, -1), C_LIGHT),
        ('FONTNAME',      (0, 1), (0, -1), 'Helvetica-Bold'),
        # Alternance de lignes
        ('ROWBACKGROUNDS', (1, 1), (-1, -1), [C_WHITE, C_STRIPE]),
        # Grille
        ('GRID',          (0, 0), (-1, -1), 0.4, C_LINE),
        ('LINEBEFORE',    (0, 0), (0, -1), 1.0, C_LINE),
        # Alignement
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN',         (0, 0), (0, -1), 'CENTER'),
        ('ALIGN',         (1, 0), (-1, 0), 'CENTER'),
        ('ALIGN',         (1, 1), (-1, -1), 'LEFT'),
        # Padding
        ('LEFTPADDING',   (1, 1), (-1, -1), 4),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 3),
        ('TOPPADDING',    (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    return t


def _build_classe_title(filiere_code, filiere_nom, niveau_nom, nb_creneaux):
    """Bandeau de titre pour la classe (filière + niveau)."""
    page_w = landscape(A4)[0] - 2.4 * cm
    s_titre = _ps('cltitre', 13, bold=True, color=C_HEADER, align=TA_LEFT)
    s_sous  = _ps('clsous', 8.5, color=C_GOLD, align=TA_LEFT)
    s_nb    = _ps('clnb', 8, color=C_GRAY, align=TA_RIGHT)

    titre_html = f"FILIÈRE&nbsp;: <font color='#8B6914'>{filiere_code}</font>"
    if filiere_nom and filiere_nom != filiere_code:
        titre_html += f" — {filiere_nom}"
    titre_html += f"&nbsp;&nbsp;·&nbsp;&nbsp;CLASSE&nbsp;: <font color='#8B6914'>{niveau_nom}</font>"

    titre_para = Paragraph(titre_html, s_titre)
    nb_para = Paragraph(
        f"{nb_creneaux} créneau{'x' if nb_creneaux != 1 else ''} planifié{'s' if nb_creneaux != 1 else ''}",
        s_nb,
    )

    data = [[titre_para, nb_para]]
    t = Table(data, colWidths=[page_w * 0.7, page_w * 0.3])
    t.setStyle(TableStyle([
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('LINEABOVE',     (0, 0), (-1, 0), 1.2, C_GOLD),
        ('LINEBELOW',     (0, 0), (-1, 0), 0.4, C_LINE),
        ('BACKGROUND',    (0, 0), (-1, 0), C_LIGHT),
        ('LEFTPADDING',   (0, 0), (-1, -1), 6),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 6),
        ('TOPPADDING',    (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    return t


def _build_footer():
    page_w = landscape(A4)[0] - 2.4 * cm
    s = _ps('sign', 9, bold=True, color=C_HEADER, align=TA_CENTER)
    s_line = _ps('sl', 8, color=C_GRAY, align=TA_CENTER)

    data = [[
        '',
        [
            Paragraph("Le Doyen", s),
            Spacer(1, 10 * mm),
            Paragraph("_______________________", s_line),
        ],
    ]]
    t = Table(data, colWidths=[page_w * 0.6, page_w * 0.4])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN',  (1, 0), (1, 0), 'CENTER'),
    ]))
    return t


# ── Grille examens (dates × plages) ──────────────────────────────────────────

def _fmt_date_jour(d):
    """Ex : 'Lundi 13 avril 2026'"""
    nom_jour = JOURS_FR[d.weekday()].capitalize()
    return f"{nom_jour} {d.day} {MOIS_FR[d.month - 1]} {d.year}"


def _build_grid_examens(grid, jours_uniques):
    """
    Grille examens : rows = dates uniques, cols = 4 plages horaires (2h).
    Chaque cellule peut contenir plusieurs examens (salles différentes).
    """
    page_w = landscape(A4)[0] - 2.4 * cm
    col_date = 3.2 * cm
    col_plage = (page_w - col_date) / 4

    s_th   = _ps('exth',  8,   bold=True, color=C_WHITE)
    s_date = _ps('exdt',  7.5, bold=True, color=C_DARK, align=TA_LEFT)
    s_cell = _ps('excell', 6.5, align=TA_LEFT, leading=8.5)

    # En-têtes
    header_row = [Paragraph('<b>Date</b>', s_th)] + [
        Paragraph(f"<b>{label}</b>", s_th)
        for _, _, label in PLAGES_EXAMEN
    ]

    rows = [header_row]
    row_heights = [0.65 * cm]

    for jour_date in jours_uniques:
        date_para = Paragraph(_fmt_date_jour(jour_date), s_date)
        row = [date_para]
        max_n = 1

        for debut, fin, _ in PLAGES_EXAMEN:
            entries = grid[jour_date].get(debut, [])
            if not entries:
                row.append('')
                continue

            parts = []
            for c in entries:
                fil   = f"{c.filiere.code} " if c.filiere else ''
                niv   = c.niveau.nom if c.niveau else ''
                salle = c.salle.nom if c.salle else '—'
                chef  = f"<font color='#888888'>Chef : {c.chef_salle.nom}</font>" if c.chef_salle else ''
                surv  = ', '.join(
                    f"{e.nom}" for e in c.surveillants.all()
                )
                surv_str = f"<font color='#888888'>Surv. : {surv}</font>" if surv else ''

                intitule_short = c.intitule[:30] + ('…' if len(c.intitule) > 30 else '')

                parts.append(
                    f"<font color='#8B6914' size='7.5'><b>{fil}{niv}</b></font><br/>"
                    f"<b>{c.code_matiere}</b> <font size='6'>{intitule_short}</font><br/>"
                    f"<font size='6.5' color='#444'>Salle {salle}</font>"
                    + (f"<br/>{chef}" if chef else '')
                    + (f"<br/>{surv_str}" if surv_str else '')
                )

            separator = "<br/><font size='2.5'> </font><br/>"
            row.append(Paragraph(separator.join(parts), s_cell))
            max_n = max(max_n, len(entries))

        rows.append(row)
        # Hauteur : base 1.5cm + 1.0cm par examen sup (cellules plus denses)
        row_heights.append(1.5 * cm + (max_n - 1) * 1.0 * cm)

    t = Table(rows, colWidths=[col_date] + [col_plage] * 4, rowHeights=row_heights)
    t.setStyle(TableStyle([
        ('BACKGROUND',     (0, 0), (-1, 0), C_HEADER),
        ('TEXTCOLOR',      (0, 0), (-1, 0), C_WHITE),
        ('BACKGROUND',     (0, 1), (0, -1), C_LIGHT),
        ('FONTNAME',       (0, 1), (0, -1), 'Helvetica-Bold'),
        ('ROWBACKGROUNDS', (1, 1), (-1, -1), [C_WHITE, C_STRIPE]),
        ('GRID',           (0, 0), (-1, -1), 0.4, C_LINE),
        ('LINEBEFORE',     (0, 0), (0, -1), 1.0, C_LINE),
        ('VALIGN',         (0, 0), (-1, -1), 'TOP'),
        ('ALIGN',          (0, 0), (-1, 0), 'CENTER'),
        ('ALIGN',          (0, 1), (0, -1), 'LEFT'),
        ('ALIGN',          (1, 1), (-1, -1), 'LEFT'),
        ('LEFTPADDING',    (0, 1), (-1, -1), 4),
        ('RIGHTPADDING',   (0, 0), (-1, -1), 3),
        ('TOPPADDING',     (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING',  (0, 0), (-1, -1), 3),
    ]))
    return t


def generer_pdf_examens(edt_id: int) -> BytesIO:
    """
    Génère le PDF officiel UEB pour un planning d'examens ou de rattrapage.
    Grille : dates uniques × 4 plages horaires de 2h.
    """
    edt = EmploiDuTemps.objects.select_related('campus').get(pk=edt_id)

    creneaux = (
        CreneauExamen.objects
        .filter(emploi_du_temps=edt)
        .select_related('salle', 'filiere', 'niveau', 'chef_salle')
        .prefetch_related('surveillants')
        .order_by('jour', 'heure_debut')
    )

    # Grille {date: {heure_debut: [creneaux]}}
    grid = defaultdict(lambda: defaultdict(list))
    for c in creneaux:
        grid[c.jour][c.heure_debut].append(c)

    jours_uniques = sorted(grid.keys())

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=1.2 * cm,
        rightMargin=1.2 * cm,
        topMargin=0.8 * cm,
        bottomMargin=1.0 * cm,
    )

    story = []
    story.append(_build_header(edt))
    story.append(Spacer(1, 3 * mm))
    story.extend(_build_meta(edt))

    if jours_uniques:
        story.append(_build_grid_examens(grid, jours_uniques))
    else:
        story.append(Paragraph(
            "Aucun créneau enregistré pour ce planning.",
            _ps('vide', 10, color=C_GRAY),
        ))

    story.append(Spacer(1, 6 * mm))
    story.append(_build_footer())

    doc.build(story)
    buffer.seek(0)
    return buffer


# ── Point d'entrée ───────────────────────────────────────────────────────────

_ORDRE_NIVEAU = {'L1': 1, 'L2': 2, 'L3': 3, 'M1': 4, 'M2': 5}


def _grouper_par_classe(creneaux):
    """Regroupe les créneaux par classe (niveau) et trie filière puis niveau.

    Retourne une liste de dicts : {filiere_code, filiere_nom, niveau_nom, creneaux}
    """
    classes = {}
    for c in creneaux:
        mat = c.matiere
        niv = mat.niveau if mat else None
        fil = niv.filiere if niv else None
        fil_code = fil.code if fil else '—'
        fil_nom  = fil.nom if fil else ''
        niv_nom  = niv.nom if niv else '—'
        key = (fil_code, niv_nom)
        if key not in classes:
            classes[key] = {
                'filiere_code': fil_code,
                'filiere_nom':  fil_nom,
                'niveau_nom':   niv_nom,
                'creneaux':     [],
            }
        classes[key]['creneaux'].append(c)

    return sorted(
        classes.values(),
        key=lambda x: (x['filiere_code'], _ORDRE_NIVEAU.get(x['niveau_nom'], 99)),
    )


def generer_pdf_edt(edt_id: int) -> BytesIO:
    """
    Génère le PDF officiel UEB pour l'EmploiDuTemps donné.
    Une page (ou plus) par classe : chaque classe a son propre en-tête
    bilingue, son titre, sa grille et son footer signature.
    """
    edt = EmploiDuTemps.objects.select_related('campus').get(pk=edt_id)

    creneaux = (
        Creneau.objects
        .filter(emploi_du_temps=edt)
        .select_related(
            'salle',
            'matiere__enseignant',
            'matiere__niveau__filiere',
        )
        .order_by('jour', 'heure_debut')
    )

    classes = _grouper_par_classe(creneaux)

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=1.2 * cm,
        rightMargin=1.2 * cm,
        topMargin=0.8 * cm,
        bottomMargin=1.0 * cm,
    )

    story = []

    if not classes:
        story.append(_build_header(edt))
        story.append(Spacer(1, 3 * mm))
        story.extend(_build_meta(edt))
        story.append(Paragraph(
            "Aucun créneau enregistré pour cet emploi du temps.",
            _ps('vide', 10, color=C_GRAY),
        ))
        story.append(Spacer(1, 6 * mm))
        story.append(_build_footer())
    else:
        for idx, classe in enumerate(classes):
            # Grille de cette classe uniquement
            grid = defaultdict(lambda: defaultdict(list))
            for c in classe['creneaux']:
                grid[c.jour][c.heure_debut].append(c)

            story.append(_build_header(edt))
            story.append(Spacer(1, 3 * mm))
            story.extend(_build_meta(edt))
            story.append(_build_classe_title(
                classe['filiere_code'],
                classe['filiere_nom'],
                classe['niveau_nom'],
                len(classe['creneaux']),
            ))
            story.append(Spacer(1, 3 * mm))
            story.append(_build_grid(edt, grid))
            story.append(Spacer(1, 6 * mm))
            story.append(_build_footer())

            if idx < len(classes) - 1:
                story.append(PageBreak())

    doc.build(story)
    buffer.seek(0)
    return buffer
