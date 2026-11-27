"""Generate the promo narration with the pet's own voice.

Uses the same voice as the desk pet (「基石白毛」, designed in ElevenLabs Voice
Design) through the official `elevenlabs` CLI, so the trailer sounds like the
character rather than a generic announcer. Auth is the CLI's own login.

Writes promo/src/vo/vo_<n>.mp3 and prints each clip's duration.

Usage: python tts_vo.py [--force]
"""

import argparse
import glob
import json
import os
import shutil
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "vo")
VOICE_ID = "nIHlF0W9GAWokF1eFwWt"  # 「基石白毛」

# One line per beat of the film. Kept short: the music carries the drama, she
# only points at things.
LINES = [
    "管理员，今天也一起看看这片宇宙吧。",
    "开心、发呆、难过——我都演给你看。",
    "把界面换成深空的颜色，就只剩下一道光。",
    "暗一点的宇宙，好像更适合待久一点。",
    "星尘花去了哪里，我都替你记着。",
    "两个仓库，各自独立，挑你喜欢的装就好。",
    "来探索新的宇宙吧，管理员。",
]


def find_cli():
    hits = glob.glob(os.path.join(
        os.environ.get("APPDATA", ""), "npm", "node_modules", "@elevenlabs", "cli",
        "node_modules", "@elevenlabs", "cli-*", "elevenlabs.exe"))
    return hits[0] if hits else shutil.which("elevenlabs")


def duration(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "default=nw=1:nk=1", path], capture_output=True, text=True)
    try:
        return float(r.stdout.strip())
    except ValueError:
        return 0.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--voice-id", default=VOICE_ID)
    ap.add_argument("--model", default="eleven_v4")
    a = ap.parse_args()

    exe = find_cli()
    if not exe:
        sys.exit("elevenlabs CLI not found (npm i -g @elevenlabs/cli, then `elevenlabs auth login`).")

    os.makedirs(OUT, exist_ok=True)
    meta = []
    for i, text in enumerate(LINES):
        dst = os.path.join(OUT, f"vo_{i:02d}.mp3")
        if os.path.exists(dst) and os.path.getsize(dst) > 1000 and not a.force:
            d = duration(dst)
            meta.append({"i": i, "text": text, "file": os.path.basename(dst), "sec": round(d, 3)})
            print(f"{i}: cached {d:.2f}s  {text}", flush=True)
            continue
        cmd = [exe, "text-to-speech", "convert", "--voice-id", a.voice_id,
               "--model-id", a.model, "--language-code", "zh",
               "--output-format", "mp3_44100_128", "--format", "raw", "--text", text]
        ok = False
        for attempt in range(4):
            r = subprocess.run(cmd, capture_output=True)
            head = r.stdout[:3]
            if r.returncode == 0 and (head == b"ID3" or r.stdout[:2] == b"\xff\xfb"):
                open(dst, "wb").write(r.stdout)
                ok = True
                break
            print(f"{i}: retry {attempt} rc={r.returncode} {r.stderr[:160].decode('utf-8', 'replace')}",
                  flush=True)
            time.sleep(3 * (attempt + 1))
        if not ok:
            sys.exit(f"line {i} failed")
        d = duration(dst)
        meta.append({"i": i, "text": text, "file": os.path.basename(dst), "sec": round(d, 3)})
        print(f"{i}: {d:.2f}s  {text}", flush=True)

    json.dump(meta, open(os.path.join(OUT, "vo.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    total = sum(m["sec"] for m in meta)
    print(f"\n{len(meta)} lines, {total:.1f}s of speech")


if __name__ == "__main__":
    main()
