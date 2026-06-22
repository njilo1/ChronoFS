"""
Génère un fichier Excel de test SBAA (Ébolowa + Monatélé) au format d'import
officiel, à partir des plannings PDF réels du 01→06/06/2026.

- Crée d'abord le référentiel SBAA manquant (filières, UE, enseignants) de
  façon idempotente (get_or_create) — additif, ne casse aucune donnée.
- Produit ensuite le fichier dans /home/neo/Bureau/ChronoFS/test/.
- Vérifie enfin le fichier avec le vrai parser d'import (0 erreur attendu).
"""
import io
import openpyxl

from core.models import Departement, Filiere, UE, Enseignant
from core.constants import Niveau, Ville, Grade, StatutEnseignant
from core.services.excel_service import (
    generate_template_excel, parse_import_excel,
    NIVEAU_CODE_VERS_AFFICHE, HORAIRES_AFFICHES_HUM, JOURS_AFFICHES,
)

CHEMIN = '/home/neo/Bureau/ChronoFS/test/Planning_SBAA_S23_2026.xlsx'

dept = Departement.objects.get(code='SBAA')

# ── 1. Référentiel SBAA ───────────────────────────────────────────────────────
def filiere(nom, code, niveau, ville, eff):
    f, _ = Filiere.objects.get_or_create(
        code=code, niveau=niveau, ville=ville,
        defaults={'nom': nom, 'departement': dept, 'effectif': eff},
    )
    return f

f_sbaa_l2_eb = filiere('SBAA L2', 'SBAA', Niveau.L2, Ville.EBOLOWA, 45)
f_sbaa_l1_mo = filiere('SBAA L1', 'SBAA', Niveau.L1, Ville.MONATELE, 50)
f_sbaa_l2_mo = filiere('SBAA L2', 'SBAA', Niveau.L2, Ville.MONATELE, 40)
f_mac_l1_mo  = filiere('Machinisme Agricole L1', 'MAC', Niveau.L1, Ville.MONATELE, 35)
f_mac_l2_mo  = filiere('Machinisme Agricole L2', 'MAC', Niveau.L2, Ville.MONATELE, 25)
f_mac_l3_mo  = filiere('Machinisme Agricole L3', 'MAC', Niveau.L3, Ville.MONATELE, 20)

def ue(code, intitule, fil):
    u, _ = UE.objects.get_or_create(code=code, defaults={'intitule': intitule, 'filiere': fil})
    return u

ue('SBA242',  'Pratiques agricoles',                          f_sbaa_l2_eb)
ue('SBA1323', 'Pratique de diverses activités agricoles',     f_sbaa_l1_mo)
ue('SBA224',  'Génétique',                                    f_sbaa_l2_mo)
ue('MAC142',  'Machine électrique',                           f_mac_l1_mo)
ue('MAC242',  'Suivi des réalisations des projets agricoles', f_mac_l2_mo)
ue('MAC342',  'Suivi des réalisations des projets agricoles', f_mac_l3_mo)

def ens(nom, grade):
    e, _ = Enseignant.objects.get_or_create(
        nom=nom, grade=grade,
        defaults={'statut': StatutEnseignant.PERMANENT},
    )
    e.departements.add(dept)
    return e

ens('ONDOUA', Grade.DR); ens('MOUCHILI', Grade.DR); ens('SUMO', Grade.PR)

# Nettoyage : détacher de SBAA les enseignants Machinisme (PA) rattachés à tort
# lors d'un essai précédent — sans supprimer les enseignants eux-mêmes.
for nom, grade in [('THEPI', Grade.DR), ('TOUPOU', Grade.ING), ('ATANGANA', Grade.PR)]:
    e = Enseignant.objects.filter(nom=nom, grade=grade).first()
    if e:
        e.departements.remove(dept)

# ── 2. Lignes du planning (fidèles aux PDF) ──────────────────────────────────
LICENCE1, LICENCE2, LICENCE3 = (NIVEAU_CODE_VERS_AFFICHE[n] for n in (Niveau.L1, Niveau.L2, Niveau.L3))
H = HORAIRES_AFFICHES_HUM                     # ['7h30-10h00', ...]
TOUS = [0, 1, 2, 3]                           # créneaux C0..C3
def jours(*idx): return [JOURS_AFFICHES[i] for i in idx]

# Chaque entrée : (niveau, classe, code_ue, intitulé, enseignant, type, jours, créneaux)
COURS = [
    # Ébolowa — terrain (TP agricole), Lundi→Samedi
    (LICENCE2, 'SBAA L2 (Ébolowa)', 'SBA242', 'Pratiques agricoles', 'Dr ONDOUA', 'TP',
     jours(0,1,2,3,4,5), TOUS),
    # Monatélé — terrain (TP agricole), Mardi→Vendredi
    (LICENCE1, 'SBAA L1', 'SBA1323', 'Pratique de diverses activités agricoles', 'Dr MOUCHILI', 'TP',
     jours(1,2,3,4), TOUS),
    # Monatélé — salle (CM), Lundi→Vendredi
    (LICENCE2, 'SBAA L2 (Monatélé)', 'SBA224', 'Génétique', 'Pr SUMO', 'CM',
     jours(0,1,2,3,4), TOUS),
    # NB : le « Machinisme Agricole » (MAC142/MAC242) appartient au département PA
    # dans le référentiel — il ne fait donc PAS partie d'un import SBAA.
]

lignes = []
for niveau, classe, code, intitule, enseignant, type_c, js, cs in COURS:
    for j in js:
        for c in cs:
            lignes.append([niveau, classe, code, intitule, enseignant, j, H[c], type_c, ''])

# ── 3. Construire le fichier au format officiel ──────────────────────────────
contenu, _ = generate_template_excel(dept)
wb = openpyxl.load_workbook(io.BytesIO(contenu))
ws = wb['Planning']
# Lignes de données à partir de la ligne 3 (ligne 2 = exemple ignoré à l'import)
for i, ligne in enumerate(lignes, start=3):
    for col, val in enumerate(ligne, start=1):
        ws.cell(row=i, column=col, value=val)
wb.save(CHEMIN)

# ── 4. Vérification avec le vrai parser ──────────────────────────────────────
with open(CHEMIN, 'rb') as fh:
    rapport = parse_import_excel(fh.read(), dept)

print(f'Fichier généré : {CHEMIN}')
print(f'Lignes de cours : {len(lignes)}')
print(f'Parser → OK={rapport.ok} | valides={rapport.lignes_ok} | erreurs={rapport.lignes_erreur} | vides={rapport.lignes_vides}')
for e in rapport.erreurs[:10]:
    print('  ERREUR ligne', e['ligne'], ':', e['message'])
