"""Applique un fond blanc opaque aux logos PNG (mode RGBA → RGB)."""
from PIL import Image
from pathlib import Path
import shutil

ASSETS_DIR  = Path("docs/assets")
BACKEND_DIR = Path("backend/core/static/exports")
FRONTEND_DIR = Path("frontend/src/assets")
BACKUP_DIR  = ASSETS_DIR / "originaux_transparents"
BACKUP_DIR.mkdir(exist_ok=True)

LOGOS = ["logo_ueb.png", "logo_fs.png"]

for nom in LOGOS:
    src = ASSETS_DIR / nom
    if not src.exists():
        print(f"⚠️  {src} introuvable"); continue

    backup = BACKUP_DIR / nom
    if not backup.exists():
        shutil.copy(src, backup)
        print(f"💾 Original sauvegardé : {backup}")

    img = Image.open(backup).convert("RGBA")
    fond = Image.new("RGBA", img.size, (255, 255, 255, 255))
    result = Image.alpha_composite(fond, img).convert("RGB")
    result.save(src, "PNG", optimize=True)
    print(f"✅ {src} → RGB (fond blanc)")

BACKEND_DIR.mkdir(parents=True, exist_ok=True)
for nom in LOGOS:
    src = ASSETS_DIR / nom
    if src.exists():
        shutil.copy(src, BACKEND_DIR / nom)
        print(f"📁 backend: {BACKEND_DIR / nom}")

FRONTEND_DIR.mkdir(parents=True, exist_ok=True)
shutil.copy(ASSETS_DIR / "logo_fs.png", FRONTEND_DIR / "logo_fs.png")
print(f"📁 frontend: {FRONTEND_DIR / 'logo_fs.png'}")
print("\n🎉 Terminé.")
