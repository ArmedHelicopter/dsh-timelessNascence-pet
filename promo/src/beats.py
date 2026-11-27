"""Pick the promo's music window and align cut points to real onsets.

The promo uses one excerpt of the provided track. This script (1) reports the
onset peaks inside that window and (2) fits a constant-tempo grid to them, so
scene changes can be snapped to the beat instead of to round numbers.

Usage: python beats.py <audio> <start> <end>
"""

import subprocess
import sys

import numpy as np

SR = 22050
HOP = 512


def decode(path, start=None, end=None):
    cmd = ["ffmpeg", "-v", "error"]
    if start is not None:
        cmd += ["-ss", str(start)]
    cmd += ["-i", path]
    if start is not None and end is not None:
        cmd += ["-t", str(end - start)]
    cmd += ["-ac", "1", "-ar", str(SR), "-f", "f32le", "-"]
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, dtype=np.float32)


def flux(x, win=1024):
    n = 1 + max(0, (len(x) - win) // HOP)
    idx = np.arange(win)[None, :] + HOP * np.arange(n)[:, None]
    mag = np.abs(np.fft.rfft(x[idx] * np.hanning(win)[None, :], axis=1))
    d = np.maximum(0.0, np.diff(np.log1p(1000 * mag), axis=0)).sum(axis=1)
    return np.concatenate([[0.0], d])


def peaks(f, fps, rel=0.18, min_gap=0.14):
    thr = f.max() * rel
    out = []
    for i in range(1, len(f) - 1):
        if f[i] > thr and f[i] >= f[i - 1] and f[i] > f[i + 1]:
            t = i / fps
            if out and t - out[-1] < min_gap:
                if f[i] > f[int(out[-1] * fps)]:
                    out[-1] = t
                continue
            out.append(t)
    return out


def fit_grid(f, fps, bpm_lo=80, bpm_hi=170):
    z = f - f.mean()
    ac = np.correlate(z, z, "full")[len(z) - 1:]
    ac /= ac[0] if ac[0] else 1
    lo = int(fps * 60 / bpm_hi)
    hi = int(fps * 60 / bpm_lo)
    lag = lo + int(np.argmax(ac[lo:hi]))
    bpm = 60 * fps / lag
    beat = 60 / bpm
    best_phase, best_score = 0.0, -1.0
    for phase in np.arange(0, beat, 0.004):
        grid = np.arange(phase, len(f) / fps, beat)
        score = sum(f[min(len(f) - 1, int(g * fps))] for g in grid)
        if score > best_score:
            best_phase, best_score = phase, score
    return bpm, beat, best_phase


def main():
    path = sys.argv[1]
    start, end = float(sys.argv[2]), float(sys.argv[3])
    x = decode(path, start, end)
    f = flux(x)
    fps = SR / HOP
    bpm, beat, phase = fit_grid(f, fps)
    print(f"window {start:.1f}-{end:.1f}s  ({end-start:.2f}s)  tempo {bpm:.1f} BPM  beat {beat:.4f}s  phase {phase:.3f}s")
    print("\nstrong onsets (relative to window start):")
    ps = peaks(f, fps, rel=0.22)
    print("  " + "  ".join(f"{p:.2f}" for p in ps[:80]))
    print("\nbeat grid (bar = 4 beats):")
    bars = []
    t = phase
    while t < (end - start):
        bars.append(t)
        t += beat * 4
    print("  " + "  ".join(f"{b:.2f}" for b in bars))
    print("\non best-aligned cut candidates (nearest strong onset to each bar):")
    for b in bars:
        near = min(ps, key=lambda p: abs(p - b)) if ps else None
        if near is not None and abs(near - b) <= 0.22:
            print(f"  bar {b:6.2f}  ->  onset {near:6.2f}  (abs {start+near:7.2f}s)")


if __name__ == "__main__":
    main()
