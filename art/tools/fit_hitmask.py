"""Fit HIT_FORMS (rounded-rect bands) to the union alpha of the pet clips.

Prints a JS array to paste into pet/assets/src/render/hit-test.js.
"""
import glob
import os
import subprocess
import tempfile

import cv2
import numpy as np

FF = r"C:\Users\Administrator\AppData\Local\Programs\Python\Python312\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v9.0.2.exe"
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VID = os.path.join(ROOT, "pet", "assets", "video")
FRAME = dict(x=-229.1, y=-10.6, w=443.6, h=373.4)
W, H = 888, 748
BANDS = 11

acc = np.zeros((H, W), bool)
with tempfile.TemporaryDirectory() as td:
    for name in ["idle", "talk", "interact_1", "interact_2", "sad_idle", "think_idle"]:
        subprocess.run([FF, "-v", "error", "-y", "-c:v", "libvpx-vp9", "-i", os.path.join(VID, name + ".webm"),
                        "-vf", "fps=6", os.path.join(td, name + "_%03d.png")], check=True)
    for f in glob.glob(os.path.join(td, "*.png")):
        a = cv2.imread(f, cv2.IMREAD_UNCHANGED)[..., 3]
        acc |= a > 100

cv2.imwrite(os.path.join(ROOT, "art", "inbox", "_hitunion.png"), (acc * 255).astype(np.uint8))
ys, xs = np.nonzero(acc)
y0, y1 = ys.min(), ys.max()
forms = []
edges = np.linspace(y0, y1 + 1, BANDS + 1).astype(int)
for a, b in zip(edges[:-1], edges[1:]):
    band = acc[a:b]
    cols = np.nonzero(band.any(axis=0))[0]
    if len(cols) == 0:
        continue
    # trim sparse outliers (thin hair strands, fingers) at 2% / 98%
    colw = band.sum(axis=0)
    cum = np.cumsum(colw) / colw.sum()
    xa = int(np.searchsorted(cum, 0.02))
    xb = int(np.searchsorted(cum, 0.98))

    def fx(px):
        return round(FRAME["x"] + px / W * FRAME["w"], 1)

    def fy(py):
        return round(FRAME["y"] + FRAME["h"] - py / H * FRAME["h"], 1)

    x0, x1 = fx(xa), fx(xb)
    top, bot = fy(a), fy(b)
    r = round(min(x1 - x0, top - bot) * 0.3, 1)
    forms.append(f"  ['r', {x0}, {bot}, {x1}, {top}, {r}],")

print("export const HIT_FORMS = [")
print("\n".join(forms))
print("]")
print("// coverage px", int(acc.sum()))
