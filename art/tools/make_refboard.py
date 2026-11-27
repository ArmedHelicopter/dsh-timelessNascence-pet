"""Compose the character reference board fed to the image model."""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REF = os.path.join(ROOT, "reference")
OUT = os.path.join(ROOT, "art", "prompts", "refboard.jpg")

picks = [
    "bili_poster-1795621518066.png",  # full body standing, arm up
    "bili_poster-1795621526292.png",  # full body standing
    "bili_poster-1795563598014.png",  # half body, face + jacket details
    "bili_poster-1795583303414.png",  # existing chibi face ("好宇宙")
]
H = 1000
ims = []
for p in picks:
    im = Image.open(os.path.join(REF, p)).convert("RGB")
    im = im.resize((round(im.width * H / im.height), H), Image.LANCZOS)
    ims.append(im)
board = Image.new("RGB", (sum(i.width for i in ims) + 20 * (len(ims) - 1), H), "white")
x = 0
for im in ims:
    board.paste(im, (x, 0))
    x += im.width + 20
board.thumbnail((2400, 2400))
board.save(OUT, quality=90)
print(OUT, board.size)
