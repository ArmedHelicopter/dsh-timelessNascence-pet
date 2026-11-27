"""Build the promo soundtrack: narration placed on the timeline + ducked music.

Inputs
  promo/src/vo/vo_*.mp3      narration lines (see tts_vo.py)
  promo/src/_audio_bgm.wav   the music excerpt (see README for the ffmpeg cut)

Outputs
  promo/src/_audio_mix.wav   52 s stereo mix, ready to mux
  promo/src/vo/schedule.json subtitle schedule consumed by film.html

Ducking is done with a sidechain compressor keyed by the narration, so the music
dips smoothly instead of stepping down at fixed times.

Usage: python build_audio.py
"""

import array
import json
import math
import os
import subprocess
import sys
import wave

HERE = os.path.dirname(os.path.abspath(__file__))
VO = os.path.join(HERE, "vo")
BGM = os.path.join(HERE, "_audio_bgm.wav")
OUT = os.path.join(HERE, "_audio_mix.wav")
SR = 48000
TOTAL = 52.0

# Where each line lands. Kept inside its scene and clear of the next line:
#   00 5.75  pet intro          01 9.95  pet states
#   02 18.30 skin light         03 22.90 skin dark   (ends before the splash)
#   04 32.20 features           05 40.75 two repos   06 46.70 end card
STARTS = [5.75, 9.95, 18.30, 22.90, 32.20, 40.75, 46.70]


def run(cmd):
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode != 0:
        sys.stderr.write(r.stderr.decode("utf-8", "replace")[-1500:])
        raise SystemExit(f"ffmpeg failed: {' '.join(cmd[:6])}...")


def decode_mono(path):
    """mp3/wav -> float32 numpy-free list at SR, mono."""
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR),
         "-f", "f32le", "-"],
        capture_output=True, check=True).stdout
    a = array.array("f")
    a.frombytes(raw)
    return a


def peak(x):
    return max((abs(v) for v in x), default=0.0)


def main():
    meta = json.load(open(os.path.join(VO, "vo.json"), encoding="utf-8"))
    n = len(meta)
    if n != len(STARTS):
        raise SystemExit(f"schedule has {len(STARTS)} slots but {n} lines were generated")

    track = array.array("f", bytes(4 * int(TOTAL * SR)))
    schedule = []
    for m, start in zip(meta, STARTS):
        src = os.path.join(VO, m["file"])
        x = decode_mono(src)
        p = peak(x)
        if p < 1e-6:
            raise SystemExit(f"silent clip: {src}")
        gain = 10 ** (-3.0 / 20) / p          # peak-normalise each line to -3 dBFS
        off = int(round(start * SR))
        for i, v in enumerate(x):
            j = off + i
            if j >= len(track):
                break
            track[j] = v * gain
        dur = len(x) / SR
        schedule.append({"start": round(start, 3), "dur": round(dur, 3),
                         "end": round(start + dur, 3), "text": m["text"]})
        print(f"  {start:5.2f}s  +{dur:4.2f}s  {m['text']}")

    # write mono narration track
    tmp_vo = os.path.join(HERE, "_vo_track.wav")
    with wave.open(tmp_vo, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(array.array("h", (int(max(-1.0, min(1.0, v)) * 32767) for v in track)).tobytes())

    # narration polish + duck the music under it, then sum
    run(["ffmpeg", "-y", "-v", "error",
         "-i", BGM, "-i", tmp_vo,
         "-filter_complex",
         "[1:a]highpass=f=95,acompressor=threshold=0.05:ratio=3:attack=6:release=120,"
         "loudnorm=I=-15.5:TP=-2.0:LRA=9,asplit=2[v1][v2];"
         "[0:a][v1]sidechaincompress=threshold=0.012:ratio=7:attack=18:release=420:makeup=1[bd];"
         "[bd]volume=-1.2dB[b2];"
         "[b2][v2]amix=inputs=2:duration=longest:normalize=0,"
         "alimiter=level=0:limit=0.60:attack=4:release=60,atrim=0:52,asetpts=N/SR/TB[out]",
         "-map", "[out]", "-ar", str(SR), "-ac", "2", OUT])

    json.dump(schedule, open(os.path.join(VO, "schedule.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)

    # report
    st = subprocess.run(["ffmpeg", "-hide_banner", "-i", OUT, "-af", "volumedetect",
                         "-f", "null", "-"], capture_output=True, text=True, encoding="utf-8", errors="replace").stderr or ""
    for line in st.splitlines():
        if "mean_volume" in line or "max_volume" in line:
            print(line.split("]")[-1].strip())
    eb = subprocess.run(["ffmpeg", "-hide_banner", "-i", OUT, "-af", "ebur128=peak=true",
                         "-f", "null", "-"], capture_output=True, text=True, encoding="utf-8", errors="replace").stderr or ""
    tail = [l.strip() for l in eb.splitlines() if "I:" in l or "Peak:" in l]
    print("\n".join(tail[-2:]))
    speech = sum(s["dur"] for s in schedule)
    print(f"{len(schedule)} lines, {speech:.1f}s speech in {TOTAL:.0f}s")


if __name__ == "__main__":
    main()
