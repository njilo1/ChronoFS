# -*- coding: utf-8 -*-
"""Assemble le memoire ChronoFS (.docx) a partir de memoire_contenu.md,
en respectant la mise en forme de la charte des memoires FS-UEB.

Usage: python build_memoire.py
Sortie: ChronoFS_Memoire.docx (dans ce meme dossier)
"""
import re
from pathlib import Path

from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

HERE = Path(__file__).parent
ASSETS = HERE / "memoire_assets"
LOGO_UEB = HERE.parent / "docs" / "assets" / "logo_ueb.png"
LOGO_FS = HERE.parent / "docs" / "assets" / "logo_fs.png"
CONTENU_MD = HERE / "memoire_contenu.md"
OUT_PATH = HERE / "ChronoFS_Memoire.docx"

TITRE_MEMOIRE = ("CONCEPTION ET RÉALISATION D'UNE APPLICATION WEB DE GÉNÉRATION "
                  "AUTOMATIQUE DES EMPLOIS DU TEMPS : CAS DE LA FACULTÉ DES SCIENCES "
                  "DE L'UNIVERSITÉ D'ÉBOLOWA")
AUTEUR = "TCHAMBA NJILO FERDINAND"
MATRICULE = "23I0076FS"
ENCADREUR_1 = "Dr KENGNI OLGA"
ENCADREUR_2 = "Dr NYABEYE DORIS"
ANNEE_ACAD = "2025 - 2026"

ROMAN_CHAP = {1: "I", 2: "II", 3: "III"}

# ---------------------------------------------------------------------------
# Helpers bas niveau (OOXML)
# ---------------------------------------------------------------------------

def set_font(run, size=12, bold=False, italic=False, name="Times New Roman"):
    run.font.name = name
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    rPr = run._element.get_or_add_rPr()
    rFonts = rPr.find(qn('w:rFonts'))
    if rFonts is None:
        rFonts = OxmlElement('w:rFonts')
        rPr.append(rFonts)
    rFonts.set(qn('w:eastAsia'), name)


def justify(paragraph, spacing15=True):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    pf = paragraph.paragraph_format
    if spacing15:
        pf.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    pf.space_after = Pt(8)


def add_field(paragraph, instr, result_text="1"):
    run = paragraph.add_run()
    fld1 = OxmlElement('w:fldChar'); fld1.set(qn('w:fldCharType'), 'begin')
    instrText = OxmlElement('w:instrText'); instrText.set(qn('xml:space'), 'preserve')
    instrText.text = instr
    fld2 = OxmlElement('w:fldChar'); fld2.set(qn('w:fldCharType'), 'separate')
    t = OxmlElement('w:t'); t.text = result_text
    fld3 = OxmlElement('w:fldChar'); fld3.set(qn('w:fldCharType'), 'end')
    r = run._r
    r.append(fld1); r.append(instrText); r.append(fld2); r.append(t); r.append(fld3)
    set_font(run, size=12)
    return run


def set_page_number_format(section, fmt, start):
    sectPr = section._sectPr
    pgNumType = sectPr.find(qn('w:pgNumType'))
    if pgNumType is None:
        pgNumType = OxmlElement('w:pgNumType')
        sectPr.append(pgNumType)
    pgNumType.set(qn('w:fmt'), fmt)
    pgNumType.set(qn('w:start'), str(start))


def set_margins(section, cm=2.5):
    section.top_margin = Cm(cm)
    section.bottom_margin = Cm(cm)
    section.left_margin = Cm(cm)
    section.right_margin = Cm(cm)


def new_section(doc, unlink_footer=True):
    sec = doc.add_section(WD_SECTION.NEW_PAGE)
    set_margins(sec)
    if unlink_footer:
        sec.footer.is_linked_to_previous = False
        for p in list(sec.footer.paragraphs):
            p.clear()
    return sec


def set_footer_page_number(section, align=WD_ALIGN_PARAGRAPH.RIGHT):
    footer = section.footer
    p = footer.paragraphs[0] if footer.paragraphs else footer.add_paragraph()
    p.text = ""
    p.alignment = align
    add_field(p, "PAGE")


def enable_update_fields_on_open(doc):
    element = doc.settings.element
    upd = OxmlElement('w:updateFields')
    upd.set(qn('w:val'), 'true')
    element.append(upd)


# ---------------------------------------------------------------------------
# Compteurs de figures / tableaux (numerotation manuelle de secours,
# les champs SEQ se remettront a jour dans Word via F9 / mise a jour auto)
# ---------------------------------------------------------------------------
fig_counter = 0
tab_counter = 0


def add_figure(doc, filename, caption, width_cm=14):
    global fig_counter
    fig_counter += 1
    path = ASSETS / filename
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run()
    run.add_picture(str(path), width=Cm(width_cm))
    cap = doc.add_paragraph()
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap.paragraph_format.space_after = Pt(12)
    r1 = cap.add_run(f"Figure {fig_counter}. ")
    set_font(r1, size=11, bold=True)
    r2 = cap.add_run(caption)
    set_font(r2, size=11, bold=False, italic=True)
    return fig_counter


def add_table_caption(doc, title):
    global tab_counter
    tab_counter += 1
    cap = doc.add_paragraph()
    cap.paragraph_format.space_after = Pt(4)
    r1 = cap.add_run(f"Tableau {tab_counter}. ")
    set_font(r1, size=11, bold=True)
    r2 = cap.add_run(title)
    set_font(r2, size=11, bold=False, italic=True)
    return tab_counter


def add_table(doc, header, rows):
    table = doc.add_table(rows=1, cols=len(header))
    table.style = 'Table Grid'
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr_cells = table.rows[0].cells
    for i, h in enumerate(header):
        hdr_cells[i].text = ""
        p = hdr_cells[i].paragraphs[0]
        r = p.add_run(h)
        set_font(r, size=11, bold=True)
    for row in rows:
        cells = table.add_row().cells
        for i, val in enumerate(row):
            cells[i].text = ""
            p = cells[i].paragraphs[0]
            r = p.add_run(val)
            set_font(r, size=11)
    spacer = doc.add_paragraph()
    spacer.paragraph_format.space_after = Pt(10)
    return table


# ---------------------------------------------------------------------------
# Rendu de paragraphe avec **gras** inline
# ---------------------------------------------------------------------------

def add_rich_paragraph(doc, text, size=12, align_justify=True, italic=False):
    p = doc.add_paragraph()
    if align_justify:
        justify(p)
    parts = re.split(r"(\*\*.*?\*\*)", text)
    for part in parts:
        if not part:
            continue
        if part.startswith("**") and part.endswith("**"):
            r = p.add_run(part[2:-2])
            set_font(r, size=size, bold=True, italic=italic)
        else:
            r = p.add_run(part)
            set_font(r, size=size, bold=False, italic=italic)
    return p


def add_heading(doc, text, level=1, size=14):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(8)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(text)
    set_font(r, size=size, bold=True)
    return p


def add_chapter_divider(doc, roman, title):
    """Page de garde de chapitre (non numerotee dans le flux visuel)."""
    for _ in range(6):
        doc.add_paragraph()
    p1 = doc.add_paragraph()
    p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r1 = p1.add_run(f"CHAPITRE {roman}")
    set_font(r1, size=20, bold=True)
    p2 = doc.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r2 = p2.add_run(title.upper())
    set_font(r2, size=16, bold=True)
    doc.add_page_break()


# ---------------------------------------------------------------------------
# Parsing du contenu markdown maison
# ---------------------------------------------------------------------------

def parse_blocks(md_text):
    lines = md_text.splitlines()
    blocks = []  # list of (title, body_lines)
    current_title = None
    current_body = []
    for line in lines:
        if line.startswith("## "):
            if current_title is not None:
                blocks.append((current_title, current_body))
            current_title = line[3:].strip()
            current_body = []
        elif line.startswith("# ") or line.strip() == "---" or line.startswith(">"):
            continue
        else:
            current_body.append(line)
    if current_title is not None:
        blocks.append((current_title, current_body))
    return blocks


def render_body(doc, body_lines, chapter_num=None):
    i = 0
    n = len(body_lines)
    while i < n:
        line = body_lines[i].rstrip()
        if not line.strip():
            i += 1
            continue
        # Heading level 2 (### N.M. Title)
        m = re.match(r"^### (\d+)\.(\d+)\.\s+(.+)$", line)
        if m:
            c, s, title = m.groups()
            label = f"{ROMAN_CHAP.get(chapter_num, c)}.{s}. {title}" if chapter_num else f"{c}.{s}. {title}"
            add_heading(doc, label, size=14)
            i += 1
            continue
        # Heading level 3 (#### N.M.K. Title)
        m = re.match(r"^#### (\d+)\.(\d+)\.(\d+)\.\s+(.+)$", line)
        if m:
            c, s, sub, title = m.groups()
            label = f"{ROMAN_CHAP.get(chapter_num, c)}.{s}.{sub}. {title}" if chapter_num else f"{c}.{s}.{sub}. {title}"
            add_heading(doc, label, size=13)
            i += 1
            continue
        # Figure marker
        m = re.match(r"^!\[FIGURE:([^|]+)\|(.+)\]$", line)
        if m:
            fname, caption = m.groups()
            add_figure(doc, fname.strip(), caption.strip())
            i += 1
            continue
        # Table caption marker
        m = re.match(r"^!\[TABLECAPTION:(.+)\]$", line)
        if m:
            title = m.group(1).strip()
            add_table_caption(doc, title)
            i += 1
            continue
        # Markdown table
        if line.startswith("|"):
            table_lines = []
            while i < n and body_lines[i].strip().startswith("|"):
                table_lines.append(body_lines[i].strip())
                i += 1
            header = [c.strip() for c in table_lines[0].strip("|").split("|")]
            rows = []
            for tl in table_lines[2:]:
                rows.append([c.strip() for c in tl.strip("|").split("|")])
            add_table(doc, header, rows)
            continue
        # Bullet list
        if line.startswith("- "):
            bullet_items = []
            while i < n and body_lines[i].startswith("- "):
                bullet_items.append(body_lines[i][2:].strip())
                i += 1
            for item in bullet_items:
                p = doc.add_paragraph(style='List Bullet')
                justify(p)
                parts = re.split(r"(\*\*.*?\*\*)", item)
                for part in parts:
                    if not part:
                        continue
                    if part.startswith("**") and part.endswith("**"):
                        r = p.add_run(part[2:-2]); set_font(r, size=12, bold=True)
                    else:
                        r = p.add_run(part); set_font(r, size=12)
            continue
        # Paragraph (accumulate wrapped single logical line; our source uses one line per paragraph)
        add_rich_paragraph(doc, line.strip())
        i += 1


# ---------------------------------------------------------------------------
# Pages liminaires specifiques (non markdown)
# ---------------------------------------------------------------------------

def add_cover_page(doc):
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("RÉPUBLIQUE DU CAMEROUN"); set_font(r, size=11, bold=True)
    p2 = doc.add_paragraph(); p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r2 = p2.add_run("Paix - Travail - Patrie"); set_font(r2, size=10, italic=True)

    if LOGO_UEB.exists() or LOGO_FS.exists():
        pl = doc.add_paragraph(); pl.alignment = WD_ALIGN_PARAGRAPH.CENTER
        if LOGO_UEB.exists():
            run = pl.add_run(); run.add_picture(str(LOGO_UEB), width=Cm(2.6))
            pl.add_run("      ")
        if LOGO_FS.exists():
            run2 = pl.add_run(); run2.add_picture(str(LOGO_FS), width=Cm(2.6))

    for title, size in [("UNIVERSITÉ D'ÉBOLOWA", 13), ("FACULTÉ DES SCIENCES", 13),
                          ("DÉPARTEMENT DES TECHNOLOGIES DE L'INFORMATION ET DE LA COMMUNICATION", 12)]:
        p3 = doc.add_paragraph(); p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r3 = p3.add_run(title); set_font(r3, size=size, bold=True)

    for _ in range(3):
        doc.add_paragraph()

    p4 = doc.add_paragraph(); p4.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r4 = p4.add_run("MÉMOIRE"); set_font(r4, size=16, bold=True)
    p5 = doc.add_paragraph(); p5.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r5 = p5.add_run("présenté en vue de l'obtention de la Licence en Architecture des Logiciels")
    set_font(r5, size=12, italic=True)

    for _ in range(2):
        doc.add_paragraph()

    p6 = doc.add_paragraph(); p6.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r6 = p6.add_run(TITRE_MEMOIRE); set_font(r6, size=15, bold=True)

    for _ in range(2):
        doc.add_paragraph()

    p7 = doc.add_paragraph(); p7.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r7 = p7.add_run("Par"); set_font(r7, size=12)
    p8 = doc.add_paragraph(); p8.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r8 = p8.add_run(AUTEUR); set_font(r8, size=14, bold=True)
    p9 = doc.add_paragraph(); p9.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r9 = p9.add_run(f"Matricule : {MATRICULE}"); set_font(r9, size=11)

    for _ in range(2):
        doc.add_paragraph()

    p10 = doc.add_paragraph(); p10.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r10 = p10.add_run("Sous la direction de"); set_font(r10, size=12)
    p11 = doc.add_paragraph(); p11.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r11 = p11.add_run(ENCADREUR_1); set_font(r11, size=12, bold=True)
    p12 = doc.add_paragraph(); p12.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r12 = p12.add_run(ENCADREUR_2); set_font(r12, size=12, bold=True)

    for _ in range(3):
        doc.add_paragraph()

    p13 = doc.add_paragraph(); p13.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r13 = p13.add_run(f"Année académique : {ANNEE_ACAD}"); set_font(r13, size=12, bold=True)


def add_toc_page(doc):
    add_heading(doc, "TABLE DES MATIÈRES", size=16)
    p = doc.add_paragraph()
    add_field(p, 'TOC \\o "1-3" \\h \\z \\u',
              result_text="Sommaire à générer : clic droit → Mettre à jour les champs (ou F9).")


def add_list_figures_page(doc):
    add_heading(doc, "LISTE DES FIGURES", size=16)
    p = doc.add_paragraph()
    add_field(p, 'TOC \\c "Figure"',
              result_text="Liste à générer : clic droit → Mettre à jour les champs (ou F9).")


def add_list_tableaux_page(doc):
    add_heading(doc, "LISTE DES TABLEAUX", size=16)
    p = doc.add_paragraph()
    add_field(p, 'TOC \\c "Tableau"',
              result_text="Liste à générer : clic droit → Mettre à jour les champs (ou F9).")


# ---------------------------------------------------------------------------
# Construction du document
# ---------------------------------------------------------------------------

def set_base_styles(doc):
    normal = doc.styles['Normal']
    normal.font.name = 'Times New Roman'
    normal.font.size = Pt(12)
    rPr = normal.element.get_or_add_rPr()
    rFonts = rPr.find(qn('w:rFonts'))
    if rFonts is None:
        rFonts = OxmlElement('w:rFonts'); rPr.append(rFonts)
    rFonts.set(qn('w:eastAsia'), 'Times New Roman')
    pf = normal.paragraph_format
    pf.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    pf.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY


def main():
    doc = Document()
    set_base_styles(doc)

    # --- Section 0 : couverture(s), sans numero de page ---
    sec0 = doc.sections[0]
    set_margins(sec0)
    sec0.footer.is_linked_to_previous = False
    for p in list(sec0.footer.paragraphs):
        p.clear()

    add_cover_page(doc)
    doc.add_page_break()
    add_cover_page(doc)  # page de couverture reprise en interne (papier normal)

    # --- Section 1 : pages liminaires, pagination romaine minuscule ---
    sec1 = new_section(doc, unlink_footer=True)
    set_page_number_format(sec1, 'lowerRoman', 1)
    set_footer_page_number(sec1)

    blocks = parse_blocks(CONTENU_MD.read_text(encoding='utf-8'))
    block_map = {title: body for title, body in blocks}

    add_heading(doc, "REMERCIEMENTS", size=16)
    render_body(doc, block_map["REMERCIEMENTS"])
    doc.add_page_break()

    add_toc_page(doc)
    doc.add_page_break()
    add_list_figures_page(doc)
    doc.add_page_break()
    add_list_tableaux_page(doc)
    doc.add_page_break()

    add_heading(doc, "LISTE DES ABRÉVIATIONS, SIGLES ET ACRONYMES", size=16)
    render_body(doc, block_map["LISTE DES ABRÉVIATIONS, SIGLES ET ACRONYMES"])
    doc.add_page_break()

    add_heading(doc, "LISTE DES DÉFINITIONS", size=16)
    render_body(doc, block_map["LISTE DES DÉFINITIONS"])
    doc.add_page_break()

    add_heading(doc, "RÉSUMÉ", size=16)
    render_body(doc, block_map["RÉSUMÉ"])
    add_heading(doc, "ABSTRACT", size=16)
    render_body(doc, block_map["ABSTRACT"])

    # --- Section 2 : corps du document, pagination arabe a partir de 1 ---
    sec2 = new_section(doc, unlink_footer=True)
    set_page_number_format(sec2, 'decimal', 1)
    set_footer_page_number(sec2)

    add_heading(doc, "INTRODUCTION GÉNÉRALE", size=16)
    render_body(doc, block_map["INTRODUCTION GÉNÉRALE"])
    doc.add_page_break()

    for title, body in blocks:
        m = re.match(r"^CHAPITRE (\d+) — (.+)$", title)
        if not m:
            continue
        num = int(m.group(1))
        chap_title = m.group(2)
        roman = ROMAN_CHAP.get(num, str(num))
        add_chapter_divider(doc, roman, chap_title)
        render_body(doc, body, chapter_num=num)
        doc.add_page_break()

    add_heading(doc, "CONCLUSION GÉNÉRALE, PERSPECTIVES ET RECOMMANDATIONS", size=15)
    render_body(doc, block_map["CONCLUSION GÉNÉRALE, PERSPECTIVES ET RECOMMANDATIONS"])
    doc.add_page_break()

    add_heading(doc, "RÉFÉRENCES BIBLIOGRAPHIQUES", size=16)
    for line in block_map["RÉFÉRENCES BIBLIOGRAPHIQUES"]:
        if line.strip():
            p = doc.add_paragraph(line.strip())
            p.paragraph_format.left_indent = Cm(0.5)
            p.paragraph_format.first_line_indent = Cm(-0.5)
            p.paragraph_format.space_after = Pt(8)
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            for r in p.runs:
                set_font(r, size=12)

    enable_update_fields_on_open(doc)
    doc.save(str(OUT_PATH))
    print(f"OK -> {OUT_PATH}")


if __name__ == "__main__":
    main()
