"""Write fitted HIT_FORMS and real clip durations into the pet source."""
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
PET = ROOT  # plugin lives at the repo root
FF = r"C:\Users\Administrator\AppData\Local\Programs\Python\Python312\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v9.0.2.exe"

# 1) hit forms
forms_js = subprocess.run([sys.executable, os.path.join(HERE, "fit_hitmask.py")], capture_output=True,
                          text=True, check=True).stdout
block = forms_js.split("// coverage")[0].strip()
hp = os.path.join(PET, "assets", "src", "render", "hit-test.js")
src = open(hp, encoding="utf-8").read()
src = re.sub(r"export const HIT_FORMS = \[.*?\n\]", block, src, flags=re.S)
src = src.replace("命中区按 Idle 姿态拟合成 11 个图元", "命中区按 Nascence 各循环姿态并集自动拟合成 11 条圆角横带（art/tools/fit_hitmask.py）")
open(hp, "w", encoding="utf-8").write(src)

# 2) durations
lp = os.path.join(PET, "assets", "src", "anim", "library.js")
lib = open(lp, encoding="utf-8").read()
for m in re.finditer(r"src: '([a-z_0-9]+)\.webm', duration: ([0-9.]+)", lib):
    name = m.group(1)
    out = subprocess.run([FF, "-hide_banner", "-i", os.path.join(PET, "assets", "video", name + ".webm")],
                         capture_output=True, text=True).stderr
    d = re.search(r"Duration: (\d+):(\d+):([\d.]+)", out)
    secs = int(d.group(1)) * 3600 + int(d.group(2)) * 60 + float(d.group(3))
    lib = lib.replace(m.group(0), f"src: '{name}.webm', duration: {secs:.3f}")
    print(name, f"{secs:.3f}")
open(lp, "w", encoding="utf-8").write(lib)
