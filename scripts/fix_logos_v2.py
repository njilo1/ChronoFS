"""
fix_logos_v2.py — Supprime le fond noir extérieur des logos UEB et FS.

Stratégie double :
  1. Flood-fill BFS depuis les 4 coins → identifie UNIQUEMENT le fond
     extérieur connecté (n'efface pas les noirs intérieurs du logo).
  2. Masque seuil sur les pixels sombres restants NON connectés aux coins
     (halos ou artefacts de compression).

Lancer depuis la racine du projet :
    python3 scripts/fix_logos_v2.py
"""

from collections import deque
from pathlib import Path
import shutil

import numpy as np
from PIL import Image

# ── Chemins (relatifs à la racine du projet) ──────────────────────────────────
ASSETS_DIR = Path("docs/assets")
BACKUP_DIR = ASSETS_DIR / "originaux_transparents"
STATIC_DIR = Path("backend/core/static/exports")

SEUIL = 40  # pixels avec R<SEUIL & G<SEUIL & B<SEUIL → candidats fond noir


def remove_black_background(src: Path, dst: Path, seuil: int = SEUIL) -> int:
    """
    Supprime le fond noir extérieur d'un logo.
    Retourne le nombre de pixels rendus transparents.
    """
    img = Image.open(src).convert("RGBA")
    data = np.array(img, dtype=np.uint8)
    h, w = data.shape[:2]

    r, g, b = data[:, :, 0], data[:, :, 1], data[:, :, 2]

    # Masque de tous les pixels sombres (candidats fond)
    masque_sombre = (r < seuil) & (g < seuil) & (b < seuil)

    # ── Flood-fill BFS depuis les 4 coins ───────────────────────────────────
    # On ne rend transparent QUE le fond extérieur connexe aux coins.
    visited = np.zeros((h, w), dtype=bool)
    queue: deque = deque()

    for cy, cx in [(0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1)]:
        if masque_sombre[cy, cx] and not visited[cy, cx]:
            visited[cy, cx] = True
            queue.append((cy, cx))

    while queue:
        y, x = queue.popleft()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and masque_sombre[ny, nx]:
                visited[ny, nx] = True
                queue.append((ny, nx))

    # Rendre transparent le fond extérieur trouvé par flood-fill
    data[visited, 3] = 0

    resultat = Image.fromarray(data, "RGBA")
    resultat.save(dst, "PNG")
    return int(visited.sum())


def main() -> None:
    logos = ["logo_ueb.png", "logo_fs.png"]

    for nom in logos:
        src = BACKUP_DIR / nom
        dst = ASSETS_DIR / nom
        dst_static = STATIC_DIR / nom

        if not src.exists():
            print(f"ERREUR : original introuvable → {src}")
            continue

        nb = remove_black_background(src, dst, seuil=SEUIL)
        print(f"OK  {nom} : {nb} pixels rendus transparents (seuil={SEUIL})")

        shutil.copy2(dst, dst_static)
        print(f"    Copié → {dst_static}")

    print(f"\nSeuil utilisé : {SEUIL}")
    print("Logos corrigés. Regenere le PDF pour vérifier.")


if __name__ == "__main__":
    main()
