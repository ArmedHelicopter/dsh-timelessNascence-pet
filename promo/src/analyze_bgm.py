"""Analyse a music file so the promo edit can cut on real musical landmarks.

Decodes to mono 22.05 kHz, measures an RMS envelope, an onset-strength envelope,
estimates tempo by autocorrelating the onset envelope, and segments the track into
energy plateaus (intro / build / drop / break ...) so we can pick a coherent excerpt.

Usage: python analyze_bgm.py <audio> [--json out.json]
"""

import json
import subprocess
import sys

import numpy as np

SR = 22050


def decode(path):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR),
         "-f", "f32le", "-"],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32)


def frames(x, hop=512, win=1024):
    n = 1 + max(0, (len(x) - win) // hop)
    idx = np.arange(win)[None, :] + hop * np.arange(n)[:, None]
    return x[idx]


def rms_envelope(x, hop=512, win=2048):
    f = frames(x, hop, win)
    return np.sqrt(np.mean(f ** 2, axis=1))


def onset_envelope(x, hop=512, win=1024, nfft=1024):
    f = frames(x, hop, win) * np.hanning(win)[None, :]
    mag = np.abs(np.fft.rfft(f, n=nfft, axis=1))
    logmag = np.log1p(1000.0 * mag)
    flux = np.maximum(0.0, logmag[1:] - logmag[:-1]).sum(axis=1)
    flux = np.concatenate([[0.0], flux])
    return flux


def estimate_bpm(flux, hop=512):
    fps = SR / hop
    z = flux - flux.mean()
    ac = np.correlate(z, z, mode="full")[len(z) - 1:]
    if ac[0] <= 0:
        return None, 0.0
    ac = ac / ac[0]
    lo, hi = int(fps * 60 / 200), int(fps * 60 / 60)  # 60-200 BPM
    hi = min(hi, len(ac) - 1)
    if hi <= lo + 1:
        return None, 0.0
    band = ac[lo:hi]
    lag = lo + int(np.argmax(band))
    # prefer the canonical 70-160 range on octave ties
    best = lag
    for cand in (lag * 2, lag // 2, int(lag / 3)):
        if lo <= cand < hi and ac[cand] > 0.92 * ac[lag]:
            best = cand
    return 60.0 * fps / best, float(ac[best])


def segment(env, hop=512, min_len=3.0):
    """Merge frames into plateaus of similar loudness; returns (start, end, level)."""
    fps = SR / hop
    if len(env) == 0:
        return []
    order = np.argsort(env)
    thr_lo = env[order[int(len(order) * 0.25)]]
    thr_hi = env[order[int(len(order) * 0.75)]]
    labels = np.where(env >= thr_hi, 2, np.where(env <= thr_lo, 0, 1))
    # median filter to kill single-frame flips
    k = max(1, int(fps * 0.5))
    sm = np.array([
        np.bincount(labels[max(0, i - k):i + k + 1], minlength=3).argmax()
        for i in range(len(labels))
    ])
    segs, start = [], 0
    for i in range(1, len(sm) + 1):
        if i == len(sm) or sm[i] != sm[start]:
            t0, t1 = start / fps, i / fps
            if t1 - t0 >= min_len:
                segs.append((round(t0, 2), round(t1, 2), ["quiet", "mid", "loud"][int(sm[start])]))
            start = i
    return segs


def main():
    path = sys.argv[1]
    x = decode(path)
    dur = len(x) / SR
    env = rms_envelope(x)
    flux = onset_envelope(x)
    bpm, conf = estimate_bpm(flux)
    fps = SR / 512

    rms_db = 20 * np.log10(np.maximum(env, 1e-9))
    print(f"duration      : {dur:.2f}s")
    print(f"peak / rms dB : {rms_db.max():.1f} / {10*np.log10(np.mean(env**2)):.1f}")
    print(f"tempo         : {bpm:.1f} BPM (autocorr peak {conf:.2f})" if bpm else "tempo: n/a")

    # energy per 2 s bucket, to eyeball the arrangement
    bucket = 2.0
    n = int(dur / bucket)
    print("\n   time   rmsdB  onsets")
    for i in range(n):
        a, b = int(i * bucket * fps), int((i + 1) * bucket * fps)
        e = float(rms_db[a:b].mean()) if b > a else -99
        o = float(flux[a:b].mean()) if b > a else 0
        bar = "#" * int(max(0, (e + 60)) / 2)
        print(f"  {i*bucket:5.0f}s  {e:6.1f}  {o:6.2f}  {bar}")

    print("\n  segments (quiet / mid / loud):")
    for s in segment(env):
        print(f"   {s[0]:6.1f} - {s[1]:6.1f}  {s[2]}")

    if bpm:
        beat = 60.0 / bpm
        print(f"\n  beat interval: {beat:.4f}s; bars (4/4): {beat*4:.3f}s")
        print("  downbeat grid from 0:", ", ".join(f"{i*beat*4:.2f}" for i in range(12)))

    out = sys.argv[3] if len(sys.argv) > 3 and sys.argv[2] == "--json" else None
    if out:
        peak = int(np.argmax(env))
        json.dump({
            "duration": dur, "bpm": bpm, "confidence": conf,
            "rms_db": rms_db.tolist(),
            "onset": flux.tolist(), "fps": fps,
            "loudest_at": peak / fps,
        }, open(out, "w"))
        print("\nwrote", out)


if __name__ == "__main__":
    main()
