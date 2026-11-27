"""Crop detail regions from the authoritative reference for close study."""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = Image.open(os.path.join(ROOT, "reference", "bili_poster-1795563598014.png")).convert("RGB")
out = os.path.join(ROOT, "art", "review", "ref")
os.makedirs(out, exist_ok=True)
W, H = src.size  # 1280x1856
regions = {
    "hair_ornament": (820, 230, 1080, 640),
    "eyes": (480, 480, 960, 680),
    "chest": (380, 820, 1200, 1300),
    "jacket_front": (560, 1150, 1280, 1856),
}
for k, box in regions.items():
    src.crop(box).save(os.path.join(out, k + ".jpg"), quality=90)
print(W, H)
