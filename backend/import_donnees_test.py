"""
Insertion directe des données de test dans ChronoFS via l'API REST.
S'adapte aux données existantes dans la BD.
Usage : python import_donnees_test.py
"""
import requests

BASE = "http://localhost:8000/api"

def api_get(endpoint, params=""):
    r = requests.get(f"{BASE}/{endpoint}/?page_size=500{('&' + params) if params else ''}")
    d = r.json()
    return d.get("results", d if isinstance(d, list) else [])

def api_post(endpoint, data):
    r = requests.post(f"{BASE}/{endpoint}/", json=data)
    if r.status_code in (200, 201):
        return r.json()
    print(f"  ⚠ ERREUR {endpoint}: {r.text[:150]}")
    return None

def api_patch(endpoint, pk, data):
    r = requests.patch(f"{BASE}/{endpoint}/{pk}/", json=data)
    return r.json() if r.ok else None

# ── Charger l'état actuel ─────────────────────────────────────────────────────
CAMPUS    = {c["code"]: c["id"] for c in api_get("campus")}
DEPTS_RAW = api_get("departements")
DEPTS     = {d["code"]: d for d in DEPTS_RAW}
FILIERES_RAW = api_get("filieres")
FILIERES  = {f["code"]: f for f in FILIERES_RAW}
ENS_RAW   = api_get("enseignants")
ENS_BY_EMAIL = {e["email"]: e["id"] for e in ENS_RAW}

print("État initial :")
print(f"  Campus     : {list(CAMPUS.keys())}")
print(f"  Depts      : {[d['code'] for d in DEPTS_RAW]}")
print(f"  Filières   : {list(FILIERES.keys())}")
print(f"  Enseignants: {len(ENS_RAW)}")

# ── 1. Enseignants ────────────────────────────────────────────────────────────
print("\n=== Enseignants ===")

ENSEIGNANTS = [
    # TIC
    {"nom": "NYABEYE",  "prenom": "Doris",       "grade": "Dr",  "email": "nyabeye@gmail.com",   "depts": ["TIC"]},
    {"nom": "MBIDA",    "prenom": "Jean-Pierre",  "grade": "Dr",  "email": "jmbida@ueb.cm",       "depts": ["TIC"]},
    {"nom": "ESSOMBA",  "prenom": "Claude",       "grade": "Dr",  "email": "cessomba@ueb.cm",     "depts": ["TIC"]},
    {"nom": "OWONA",    "prenom": "Robert",       "grade": "M",   "email": "rowona@ueb.cm",       "depts": ["TIC"]},
    # CHM
    {"nom": "NGONO",    "prenom": "Paul",         "grade": "Pr",  "email": "pngono@ueb.cm",       "depts": ["CHM"]},
    {"nom": "ETOUNDI",  "prenom": "Solange",      "grade": "Dr",  "email": "setoundi@ueb.cm",     "depts": ["CHM"]},
    # PHA
    {"nom": "MENYE",    "prenom": "Sylvie",       "grade": "Dr",  "email": "smenye@ueb.cm",       "depts": ["PHA"]},
    {"nom": "ATEBA",    "prenom": "Gilles",       "grade": "Dr",  "email": "gateba@ueb.cm",       "depts": ["PHA"]},
    # SBM
    {"nom": "ATANGANA", "prenom": "Martin",       "grade": "Pr",  "email": "matangana@ueb.cm",    "depts": ["SBM"]},
    {"nom": "FOUDA",    "prenom": "Marie-Claire", "grade": "Dr",  "email": "mfouda@ueb.cm",       "depts": ["SBM"]},
]

for e in ENSEIGNANTS:
    if e["email"] in ENS_BY_EMAIL:
        print(f"  ↺ {e['email']}")
        continue
    dept_ids = [DEPTS[k]["id"] for k in e["depts"] if k in DEPTS]
    obj = api_post("enseignants", {
        "nom": e["nom"], "prenom": e["prenom"], "grade": e["grade"],
        "email": e["email"], "departements": dept_ids, "est_actif": True,
    })
    if obj:
        ENS_BY_EMAIL[e["email"]] = obj["id"]
        print(f"  ✓ {e['email']}")

# Recharger
ENS_RAW = api_get("enseignants")
ENS_BY_EMAIL = {e["email"]: e["id"] for e in ENS_RAW}

# ── 2. Filières manquantes ────────────────────────────────────────────────────
print("\n=== Filières ===")

FILIERES_A_CREER = [
    {"nom": "Physique Appliquée",           "code": "PHA",    "effectif": 100, "dept": "PHA", "campus": "CPF"},
    {"nom": "Sciences Biomédicales",        "code": "SBM",    "effectif": 120, "dept": "SBM", "campus": "CPF"},
    {"nom": "Licence Informatique",         "code": "TIC-MON","effectif": 90,  "dept": "TIC", "campus": "MON"},
    {"nom": "Chimie Appliquée Monatélé",    "code": "CHM-MON","effectif": 60,  "dept": "CHM", "campus": "MON"},
]

for f in FILIERES_A_CREER:
    if f["code"] in FILIERES:
        print(f"  ↺ {f['code']}")
        continue
    dept = DEPTS.get(f["dept"])
    if not dept:
        print(f"  ⚠ département {f['dept']} introuvable")
        continue
    obj = api_post("filieres", {
        "nom": f["nom"], "code": f["code"], "effectif": f["effectif"],
        "departement": dept["id"], "campus": CAMPUS.get(f["campus"]),
    })
    if obj:
        FILIERES[f["code"]] = obj
        print(f"  ✓ {f['code']} ({f['campus']})")

# Corriger TIC et CHM : assigner les bons campus si pas encore défini
for code, campus_code in [("TIC", "CPF"), ("CHM", "LYC")]:
    if code in FILIERES and not FILIERES[code].get("campus"):
        obj = api_patch("filieres", FILIERES[code]["id"], {"campus": CAMPUS[campus_code]})
        if obj: print(f"  ✓ campus assigné à {code} → {campus_code}")

# Recharger les filières
FILIERES_RAW = api_get("filieres")
FILIERES = {f["code"]: f for f in FILIERES_RAW}

# ── 3. Niveaux ────────────────────────────────────────────────────────────────
print("\n=== Niveaux ===")

NIVEAUX_CIBLES = {
    "TIC":     [("L1", 60), ("L2", 55), ("L3", 50)],
    "CHM":     [("L1", 30), ("L2", 25), ("L3", 20)],
    "PHA":     [("L1", 40), ("L2", 35), ("L3", 30)],
    "SBM":     [("L1", 45), ("L2", 40), ("L3", 35)],
    "TIC-MON": [("L1", 35), ("L2", 30), ("L3", 25)],
    "CHM-MON": [("L1", 25), ("L2", 20), ("L3", 18)],
}

NIV_IDS = {}   # (fil_code, nom_niv) → id

for fil_code, niveaux in NIVEAUX_CIBLES.items():
    if fil_code not in FILIERES:
        print(f"  ⚠ filière {fil_code} introuvable")
        continue
    fil_id = FILIERES[fil_code]["id"]
    existants = {n["nom"]: n["id"] for n in api_get("niveaux", f"filiere={fil_id}")}

    for nom_niv, eff in niveaux:
        if nom_niv in existants:
            NIV_IDS[(fil_code, nom_niv)] = existants[nom_niv]
            print(f"  ↺ {fil_code} {nom_niv}")
        else:
            obj = api_post("niveaux", {"nom": nom_niv, "effectif": eff, "filiere": fil_id})
            if obj:
                NIV_IDS[(fil_code, nom_niv)] = obj["id"]
                print(f"  ✓ {fil_code} {nom_niv}")

# ── 4. Salles supplémentaires ─────────────────────────────────────────────────
print("\n=== Salles ===")

SALLES_RAW = api_get("salles")
SALLES_NOMS = {s["nom"] for s in SALLES_RAW}

SALLES_A_CREER = [
    {"nom": "Salle E",    "capacite": 220, "campus": "CPF"},
    {"nom": "Salle F",    "capacite": 20,  "campus": "CPF"},
    {"nom": "Salle G",    "capacite": 20,  "campus": "CPF"},
    {"nom": "Salle H",    "capacite": 20,  "campus": "LYC"},
    {"nom": "Salle J",    "capacite": 20,  "campus": "LYC"},
    {"nom": "Salle K",    "capacite": 20,  "campus": "LYC"},
    {"nom": "Salle L",    "capacite": 20,  "campus": "CRA"},
    {"nom": "Salle O",    "capacite": 30,  "campus": "CRA"},
    {"nom": "Amphi MON",  "capacite": 150, "campus": "MON"},
    {"nom": "Salle M1",   "capacite": 45,  "campus": "MON"},
    {"nom": "Salle M2",   "capacite": 45,  "campus": "MON"},
    {"nom": "Salle M3",   "capacite": 25,  "campus": "MON"},
]

for s in SALLES_A_CREER:
    if s["nom"] in SALLES_NOMS:
        print(f"  ↺ {s['nom']}")
        continue
    obj = api_post("salles", {"nom": s["nom"], "capacite": s["capacite"], "campus": CAMPUS.get(s["campus"]), "est_disponible": True})
    if obj: print(f"  ✓ {s['nom']} (cap={s['capacite']}, {s['campus']})")

# ── 5. Matières ───────────────────────────────────────────────────────────────
print("\n=== Matières ===")

# Vérifier les matières déjà en base
MATIERES_EXISTANTES = {m["code"] for m in api_get("matieres")}

MATIERES = [
    # ── TIC L1 ──────────────────────────────────────────────────────
    ("TIC111", "Algorithmique et Structures de Données",      "CM", "TIC", "L1", "nyabeye@gmail.com", 45),
    ("TIC112", "Algorithmique et Structures de Données",      "TD", "TIC", "L1", "nyabeye@gmail.com", 30),
    ("TIC113", "Introduction à la Programmation (Python)",    "CM", "TIC", "L1", "jmbida@ueb.cm",     30),
    ("TIC114", "Architecture des Ordinateurs",                "CM", "TIC", "L1", "cessomba@ueb.cm",   30),
    ("TIC115", "Mathématiques Discrètes",                     "CM", "TIC", "L1", "smenye@ueb.cm",     30),
    ("TIC116", "Anglais Technique",                           "CM", "TIC", "L1", "rowona@ueb.cm",     20),
    ("TIC117", "Systèmes d'Exploitation (bases)",             "CM", "TIC", "L1", "cessomba@ueb.cm",   25),
    # ── TIC L2 ──────────────────────────────────────────────────────
    ("TIC221", "Programmation Orientée Objet (Java)",         "CM", "TIC", "L2", "nyabeye@gmail.com", 30),
    ("TIC222", "Programmation Orientée Objet (Java)",         "TD", "TIC", "L2", "nyabeye@gmail.com", 20),
    ("TIC223", "Bases de Données Relationnelles",              "CM", "TIC", "L2", "jmbida@ueb.cm",     30),
    ("TIC224", "Bases de Données Relationnelles",              "TD", "TIC", "L2", "jmbida@ueb.cm",     20),
    ("TIC225", "Réseaux Informatiques",                       "CM", "TIC", "L2", "cessomba@ueb.cm",   30),
    ("TIC226", "Analyse et Conception (UML)",                 "CM", "TIC", "L2", "nyabeye@gmail.com", 25),
    ("TIC227", "Systèmes d'Exploitation avancés",             "CM", "TIC", "L2", "cessomba@ueb.cm",   25),
    # ── TIC L3 ──────────────────────────────────────────────────────
    ("TIC331", "Développement Web Full Stack",                "CM", "TIC", "L3", "jmbida@ueb.cm",     30),
    ("TIC332", "Développement Web Full Stack",                "TP", "TIC", "L3", "jmbida@ueb.cm",     20),
    ("TIC333", "Intelligence Artificielle",                   "CM", "TIC", "L3", "nyabeye@gmail.com", 30),
    ("TIC334", "Sécurité Informatique",                       "CM", "TIC", "L3", "cessomba@ueb.cm",   25),
    ("TIC335", "Administration Réseaux et Systèmes",          "CM", "TIC", "L3", "cessomba@ueb.cm",   25),
    ("TIC336", "Génie Logiciel",                              "CM", "TIC", "L3", "nyabeye@gmail.com", 25),
    ("TIC337", "Projet de Fin de Cycle",                      "TP", "TIC", "L3", "jmbida@ueb.cm",     60),
    # ── CHM L1 ──────────────────────────────────────────────────────
    ("CHM111", "Chimie Générale et Minérale",                 "CM", "CHM", "L1", "pngono@ueb.cm",     40),
    ("CHM112", "Chimie Générale et Minérale",                 "TD", "CHM", "L1", "pngono@ueb.cm",     20),
    ("CHM113", "Thermodynamique Chimique",                    "CM", "CHM", "L1", "setoundi@ueb.cm",   35),
    ("CHM114", "Mathématiques pour la Chimie",                "CM", "CHM", "L1", "smenye@ueb.cm",     30),
    ("CHM115", "Physique Générale",                           "CM", "CHM", "L1", "gateba@ueb.cm",     30),
    ("CHM116", "TP Chimie Générale",                          "TP", "CHM", "L1", "setoundi@ueb.cm",   20),
    # ── CHM L2 ──────────────────────────────────────────────────────
    ("CHM221", "Chimie Organique",                            "CM", "CHM", "L2", "pngono@ueb.cm",     40),
    ("CHM222", "Chimie Organique",                            "TD", "CHM", "L2", "pngono@ueb.cm",     20),
    ("CHM223", "Electrochimie",                               "CM", "CHM", "L2", "setoundi@ueb.cm",   30),
    ("CHM224", "Spectroscopie et Analyse",                    "CM", "CHM", "L2", "setoundi@ueb.cm",   25),
    ("CHM225", "TP Chimie Organique",                         "TP", "CHM", "L2", "pngono@ueb.cm",     25),
    # ── CHM L3 ──────────────────────────────────────────────────────
    ("CHM331", "Chimie Industrielle",                         "CM", "CHM", "L3", "pngono@ueb.cm",     35),
    ("CHM332", "Synthèse Organique",                          "CM", "CHM", "L3", "setoundi@ueb.cm",   30),
    ("CHM333", "Chimie de l'Environnement",                   "CM", "CHM", "L3", "pngono@ueb.cm",     25),
    ("CHM334", "TP Chimie Industrielle",                      "TP", "CHM", "L3", "setoundi@ueb.cm",   30),
    ("CHM335", "Mémoire de Licence",                          "TP", "CHM", "L3", "pngono@ueb.cm",     60),
    # ── PHA L1 ──────────────────────────────────────────────────────
    ("PHA111", "Mécanique du Point",                          "CM", "PHA", "L1", "smenye@ueb.cm",     40),
    ("PHA112", "Mécanique du Point",                          "TD", "PHA", "L1", "smenye@ueb.cm",     20),
    ("PHA113", "Electricité Générale",                        "CM", "PHA", "L1", "gateba@ueb.cm",     40),
    ("PHA114", "Optique Géométrique",                         "CM", "PHA", "L1", "smenye@ueb.cm",     30),
    ("PHA115", "Mathématiques pour la Physique",              "CM", "PHA", "L1", "smenye@ueb.cm",     35),
    ("PHA116", "TP Physique",                                 "TP", "PHA", "L1", "gateba@ueb.cm",     20),
    # ── PHA L2 ──────────────────────────────────────────────────────
    ("PHA221", "Physique Quantique",                          "CM", "PHA", "L2", "smenye@ueb.cm",     35),
    ("PHA222", "Thermodynamique",                             "CM", "PHA", "L2", "gateba@ueb.cm",     35),
    ("PHA223", "Electronique Analogique",                     "CM", "PHA", "L2", "gateba@ueb.cm",     30),
    ("PHA224", "Electromagnétisme",                           "CM", "PHA", "L2", "smenye@ueb.cm",     35),
    ("PHA225", "TP Electronique",                             "TP", "PHA", "L2", "gateba@ueb.cm",     20),
    # ── PHA L3 ──────────────────────────────────────────────────────
    ("PHA331", "Physique du Solide",                          "CM", "PHA", "L3", "smenye@ueb.cm",     35),
    ("PHA332", "Instrumentation et Mesure",                   "CM", "PHA", "L3", "gateba@ueb.cm",     30),
    ("PHA333", "Electronique Numérique",                      "CM", "PHA", "L3", "gateba@ueb.cm",     30),
    ("PHA334", "Mémoire de Licence",                          "TP", "PHA", "L3", "smenye@ueb.cm",     60),
    # ── SBM L1 ──────────────────────────────────────────────────────
    ("SBM111", "Biologie Cellulaire et Moléculaire",          "CM", "SBM", "L1", "matangana@ueb.cm",  45),
    ("SBM112", "Biologie Cellulaire et Moléculaire",          "TD", "SBM", "L1", "mfouda@ueb.cm",     20),
    ("SBM113", "Biochimie Générale",                          "CM", "SBM", "L1", "mfouda@ueb.cm",     40),
    ("SBM114", "Zoologie des Invertébrés",                    "CM", "SBM", "L1", "matangana@ueb.cm",  30),
    ("SBM115", "Botanique Générale",                          "CM", "SBM", "L1", "mfouda@ueb.cm",     30),
    ("SBM116", "Statistiques Biologiques",                    "CM", "SBM", "L1", "smenye@ueb.cm",     25),
    # ── SBM L2 ──────────────────────────────────────────────────────
    ("SBM221", "Génétique Générale",                          "CM", "SBM", "L2", "matangana@ueb.cm",  40),
    ("SBM222", "Microbiologie Générale",                      "CM", "SBM", "L2", "mfouda@ueb.cm",     35),
    ("SBM223", "Physiologie Animale",                         "CM", "SBM", "L2", "matangana@ueb.cm",  30),
    ("SBM224", "Immunologie de Base",                         "CM", "SBM", "L2", "mfouda@ueb.cm",     25),
    ("SBM225", "Biochimie Métabolique",                       "CM", "SBM", "L2", "mfouda@ueb.cm",     35),
    ("SBM226", "TP Biologie",                                 "TP", "SBM", "L2", "matangana@ueb.cm",  20),
    # ── SBM L3 ──────────────────────────────────────────────────────
    ("SBM331", "Parasitologie-Mycologie",                     "CM", "SBM", "L3", "matangana@ueb.cm",  35),
    ("SBM332", "Biologie Moléculaire et Génomique",           "CM", "SBM", "L3", "matangana@ueb.cm",  35),
    ("SBM333", "Biotechnologies",                             "CM", "SBM", "L3", "mfouda@ueb.cm",     30),
    ("SBM334", "Santé Publique",                              "CM", "SBM", "L3", "mfouda@ueb.cm",     25),
    ("SBM335", "Mémoire de Licence",                          "TP", "SBM", "L3", "matangana@ueb.cm",  60),
    # ── TIC-MON L1 ──────────────────────────────────────────────────
    ("TMTIC11", "Algorithmique et Structures de Données",     "CM", "TIC-MON", "L1", "rowona@ueb.cm",  45),
    ("TMTIC12", "Algorithmique et Structures de Données",     "TD", "TIC-MON", "L1", "rowona@ueb.cm",  30),
    ("TMTIC13", "Introduction à la Programmation",            "CM", "TIC-MON", "L1", "rowona@ueb.cm",  30),
    ("TMTIC14", "Architecture des Ordinateurs",               "CM", "TIC-MON", "L1", "rowona@ueb.cm",  25),
    ("TMTIC15", "Mathématiques pour l'Informatique",          "CM", "TIC-MON", "L1", "rowona@ueb.cm",  30),
    # ── TIC-MON L2 ──────────────────────────────────────────────────
    ("TMTIC21", "Programmation Orientée Objet",               "CM", "TIC-MON", "L2", "rowona@ueb.cm",  35),
    ("TMTIC22", "Bases de Données",                           "CM", "TIC-MON", "L2", "rowona@ueb.cm",  35),
    ("TMTIC23", "Réseaux Informatiques",                      "CM", "TIC-MON", "L2", "rowona@ueb.cm",  30),
    ("TMTIC24", "Analyse et Conception",                      "CM", "TIC-MON", "L2", "rowona@ueb.cm",  25),
    # ── TIC-MON L3 ──────────────────────────────────────────────────
    ("TMTIC31", "Développement Web",                          "CM", "TIC-MON", "L3", "rowona@ueb.cm",  35),
    ("TMTIC32", "Sécurité Informatique",                      "CM", "TIC-MON", "L3", "rowona@ueb.cm",  25),
    ("TMTIC33", "Projet de Fin de Cycle",                     "TP", "TIC-MON", "L3", "rowona@ueb.cm",  60),
    # ── CHM-MON L1 ──────────────────────────────────────────────────
    ("CMCHM11", "Chimie Générale",                            "CM", "CHM-MON", "L1", "setoundi@ueb.cm", 40),
    ("CMCHM12", "Chimie Générale",                            "TD", "CHM-MON", "L1", "setoundi@ueb.cm", 20),
    ("CMCHM13", "Thermodynamique Chimique",                   "CM", "CHM-MON", "L1", "setoundi@ueb.cm", 30),
    ("CMCHM14", "Physique Générale",                          "CM", "CHM-MON", "L1", "gateba@ueb.cm",   25),
    # ── CHM-MON L2 ──────────────────────────────────────────────────
    ("CMCHM21", "Chimie Organique",                           "CM", "CHM-MON", "L2", "setoundi@ueb.cm", 40),
    ("CMCHM22", "Electrochimie",                              "CM", "CHM-MON", "L2", "setoundi@ueb.cm", 30),
    ("CMCHM23", "Spectroscopie",                              "CM", "CHM-MON", "L2", "setoundi@ueb.cm", 25),
    # ── CHM-MON L3 ──────────────────────────────────────────────────
    ("CMCHM31", "Chimie Industrielle",                        "CM", "CHM-MON", "L3", "setoundi@ueb.cm", 35),
    ("CMCHM32", "Mémoire de Licence",                         "TP", "CHM-MON", "L3", "setoundi@ueb.cm", 60),
]

crees  = 0
sautes = 0
erreurs = 0

for (code, intitule, type_s, fil_code, niv_nom, email, vol_h) in MATIERES:
    if code in MATIERES_EXISTANTES:
        sautes += 1
        continue

    niv_id = NIV_IDS.get((fil_code, niv_nom))
    ens_id = ENS_BY_EMAIL.get(email)

    if not niv_id:
        print(f"  ⚠ niveau introuvable : {fil_code} {niv_nom} pour {code}")
        erreurs += 1
        continue
    if not ens_id:
        print(f"  ⚠ enseignant introuvable : {email} pour {code}")
        erreurs += 1
        continue

    # Calculer nb_seances depuis volume horaire (séances de 2h30 = 2.5h)
    nb_seances = max(1, round(vol_h / 2.5))

    obj = api_post("matieres", {
        "code": code, "intitule": intitule, "type_seance": type_s,
        "niveau": niv_id, "enseignant": ens_id,
        "volume_horaire": vol_h,
    })
    if obj:
        crees += 1
        print(f"  ✓ {code} — {intitule[:40]} ({fil_code} {niv_nom})")
    else:
        erreurs += 1

# ── Résumé final ──────────────────────────────────────────────────────────────
print("\n" + "="*60)
print(f"TERMINÉ : {crees} matières créées, {sautes} existaient déjà, {erreurs} erreurs")
print("="*60)

# Stats finales
total_matieres = len(api_get("matieres"))
total_ens      = len(api_get("enseignants"))
total_niveaux  = len(api_get("niveaux"))
total_fil      = len(api_get("filieres"))
total_salles   = len(api_get("salles"))
print(f"\nÉtat final de la BD :")
print(f"  Filières   : {total_fil}")
print(f"  Niveaux    : {total_niveaux}")
print(f"  Enseignants: {total_ens}")
print(f"  Matières   : {total_matieres}")
print(f"  Salles     : {total_salles}")
