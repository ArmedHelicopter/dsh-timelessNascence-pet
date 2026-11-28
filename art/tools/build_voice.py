"""Build pet/assets/voice/ from the TTS takes saved in art/voice/takes/.

Input: art/voice/takes/line_<i>.mp3 (index into art/voice/lines.json).
Output: pet/assets/voice/zh_<i>.mp3 (loudness-normalised, trimmed) + manifest.json {text: {zh, zhMs}}.
"""
import json
import os
import re
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
def _ffmpeg():
    # Prefer an explicit FFMPEG, then the imageio-ffmpeg build (known-good silenceremove), then PATH.
    if os.environ.get("FFMPEG"):
        return os.environ["FFMPEG"]
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"


FF = _ffmpeg()
TAKES = os.path.join(ROOT, "art", "voice", "takes")
OUT = os.path.join(ROOT, "assets", "voice")

lines = json.load(open(os.path.join(ROOT, "art", "voice", "lines.json"), encoding="utf-8"))
os.makedirs(OUT, exist_ok=True)
manifest = {}
missing = []
for i, text in enumerate(lines):
    src = os.path.join(TAKES, f"line_{i}.mp3")
    if not os.path.exists(src):
        missing.append(i)
        continue
    name = f"zh_{i:02d}.mp3"
    dst = os.path.join(OUT, name)
    subprocess.run([FF, "-v", "error", "-y", "-i", src, "-af",
                    "silenceremove=start_periods=1:start_threshold=-50dB,areverse,"
                    "silenceremove=start_periods=1:start_threshold=-50dB,areverse,"
                    "loudnorm=I=-18:TP=-1.5:LRA=11",
                    "-ar", "44100", "-ac", "1", "-b:a", "96k", dst], check=True)
    err = subprocess.run([FF, "-hide_banner", "-i", dst], capture_output=True, text=True).stderr
    d = re.search(r"Duration: (\d+):(\d+):([\d.]+)", err)
    ms = int(round((int(d.group(1)) * 3600 + int(d.group(2)) * 60 + float(d.group(3))) * 1000))
    manifest[text] = {"zh": name, "zhMs": ms}
json.dump(manifest, open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(manifest), "lines; missing", missing)
