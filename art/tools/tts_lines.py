"""Generate every pet dialogue line with ElevenLabs TTS (REST API).

The API key is read from the ELEVENLABS_API_KEY environment variable only (never stored in the repo).
Usage:  python art/tools/tts_lines.py [--voice 基石白毛] [--model auto] [--only 3,7] [--force]
Writes art/inbox/voice_takes/line_<i>.mp3 for each index in art/voice/lines.json, then run build_voice.py.
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
API = "https://api.elevenlabs.io"
OUT = os.path.join(ROOT, "art", "inbox", "voice_takes")


def call(path, key, body=None, accept="application/json"):
    req = urllib.request.Request(API + path, method="POST" if body is not None else "GET")
    req.add_header("xi-api-key", key)
    req.add_header("Accept", accept)
    data = None
    if body is not None:
        req.add_header("Content-Type", "application/json")
        data = json.dumps(body).encode("utf-8")
    with urllib.request.urlopen(req, data, timeout=120) as r:
        return r.read()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="基石白毛")
    ap.add_argument("--model", default="auto")
    ap.add_argument("--only", default="")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if not key:
        sys.exit("Set ELEVENLABS_API_KEY in your environment first (the key is never written to disk).")

    voices = json.loads(call("/v1/voices", key))["voices"]
    match = [v for v in voices if v.get("name", "").strip() == a.voice]
    if not match:
        sys.exit("voice not found: %s; available: %s" % (a.voice, [v.get("name") for v in voices][:30]))
    voice_id = match[0]["voice_id"]

    model = a.model
    if model == "auto":
        models = json.loads(call("/v1/models", key))
        ids = [m["model_id"] for m in models if m.get("can_do_text_to_speech")]
        pref = [i for i in ids if "v4" in i] or [i for i in ids if "v3" in i] or ids
        model = sorted(pref)[-1]
    print("voice", a.voice, voice_id, "model", model, flush=True)

    lines = json.load(open(os.path.join(ROOT, "art", "voice", "lines.json"), encoding="utf-8"))
    only = {int(x) for x in a.only.split(",") if x.strip()} if a.only else None
    os.makedirs(OUT, exist_ok=True)
    for i, text in enumerate(lines):
        if only is not None and i not in only:
            continue
        dst = os.path.join(OUT, f"line_{i}.mp3")
        if os.path.exists(dst) and not a.force:
            continue
        body = {"text": text.replace("\n", ""), "model_id": model, "language_code": "zh",
                "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}}
        for attempt in range(4):
            try:
                audio = call(f"/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128", key, body, "audio/mpeg")
                open(dst, "wb").write(audio)
                print(i, len(audio), flush=True)
                break
            except urllib.error.HTTPError as e:
                msg = e.read()[:300].decode("utf-8", "replace")
                if e.code == 400 and "language_code" in msg and "language_code" in body:
                    body.pop("language_code")
                    continue
                print(i, "HTTP", e.code, msg, flush=True)
                time.sleep(3 * (attempt + 1))
            except Exception as e:  # network hiccup
                print(i, "error", e, flush=True)
                time.sleep(3 * (attempt + 1))


if __name__ == "__main__":
    main()
