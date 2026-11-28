"""Generate every pet dialogue line with ElevenLabs TTS through the official `elevenlabs` CLI.

Auth: the CLI's own sign-in (`elevenlabs auth login`, OAuth in the OS keyring) — no API key is handled here.
Usage:  python art/tools/tts_lines.py [--voice-id ID] [--model eleven_v4] [--only 3,7] [--force]
Writes art/voice/takes/line_<i>.mp3 for each index in art/voice/lines.json; then run build_voice.py.
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
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, "art", "voice", "takes")  # raw takes are archived in git
VOICE_ID = "nIHlF0W9GAWokF1eFwWt"  # 「基石白毛」, designed in ElevenLabs Voice Design


def find_cli():
    hits = glob.glob(os.path.join(os.environ.get("APPDATA", ""), "npm", "node_modules", "@elevenlabs", "cli",
                                  "node_modules", "@elevenlabs", "cli-*", "elevenlabs.exe"))
    return hits[0] if hits else shutil.which("elevenlabs")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice-id", default=VOICE_ID)
    ap.add_argument("--model", default="eleven_v4")
    ap.add_argument("--only", default="")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    exe = find_cli()
    if not exe:
        sys.exit("elevenlabs CLI not found (npm i -g @elevenlabs/cli, then `elevenlabs auth login`).")

    lines = json.load(open(os.path.join(ROOT, "art", "voice", "lines.json"), encoding="utf-8"))
    only = {int(x) for x in a.only.split(",") if x.strip()} if a.only else None
    os.makedirs(OUT, exist_ok=True)
    for i, text in enumerate(lines):
        if only is not None and i not in only:
            continue
        dst = os.path.join(OUT, f"line_{i}.mp3")
        if os.path.exists(dst) and os.path.getsize(dst) > 1000 and not a.force:
            continue
        cmd = [exe, "text-to-speech", "convert", "--voice-id", a.voice_id, "--model-id", a.model,
               "--language-code", "zh", "--output-format", "mp3_44100_128", "--format", "raw",
               "--text", text.replace("\n", "")]
        for attempt in range(4):
            r = subprocess.run(cmd, capture_output=True)
            if r.returncode == 0 and r.stdout[:3] == b"ID3" or r.stdout[:2] == b"\xff\xfb":
                open(dst, "wb").write(r.stdout)
                print(i, len(r.stdout), flush=True)
                break
            print(i, "failed", r.returncode, r.stderr[:200].decode("utf-8", "replace"), flush=True)
            time.sleep(3 * (attempt + 1))


if __name__ == "__main__":
    main()
