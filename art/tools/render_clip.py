"""Green-screen clip/image -> 888x748 transparent WebM (VP9 alpha) for dsh-nascence-pet.

Usage:
  python render_clip.py IN OUT.webm [--fps 30] [--start S] [--dur D] [--scale 0.82] [--reverse]
                        [--box x0,y0,x1,y1]   # fixed crop box in source pixels (keep identical across clips)
IN can be a video (mp4/webm) or a single image (renders a 1.5 s still).

Keying: chroma distance from the dominant background green, soft edge, green despill.
"""
import argparse
import os
import subprocess
import sys
import tempfile

import cv2
import numpy as np

FF = r"C:\Users\Administrator\AppData\Local\Programs\Python\Python312\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v9.0.2.exe"
W, H = 888, 748


def read_frames(path, start, dur, fps):
    ext = os.path.splitext(path)[1].lower()
    if ext in (".png", ".jpg", ".jpeg", ".webp"):
        im = cv2.imread(path, cv2.IMREAD_COLOR)
        return [im] * int(round((dur or 1.5) * fps))
    cap = cv2.VideoCapture(path)
    src_fps = cap.get(cv2.CAP_PROP_FPS) or fps
    frames, t = [], 0
    i = 0
    while True:
        ok, im = cap.read()
        if not ok:
            break
        t = i / src_fps
        i += 1
        if t < start:
            continue
        if dur and t >= start + dur:
            break
        frames.append(im)
    # resample to target fps
    n_out = int(round(len(frames) * fps / src_fps))
    if n_out and n_out != len(frames):
        idx = np.linspace(0, len(frames) - 1, n_out).round().astype(int)
        frames = [frames[k] for k in idx]
    return frames


def bg_color(im):
    h, w = im.shape[:2]
    border = np.concatenate([im[:8].reshape(-1, 3), im[-8:].reshape(-1, 3),
                             im[:, :8].reshape(-1, 3), im[:, -8:].reshape(-1, 3)])
    return np.median(border, axis=0)


def key(im, bg):
    f = im.astype(np.float32)
    b, g, r = f[..., 0], f[..., 1], f[..., 2]
    # "greenness" = how much green exceeds the max of red/blue, compared to the background's
    gx = g - np.maximum(r, b)
    bgx = float(bg[1] - max(bg[0], bg[2]))
    t = np.clip(gx / max(bgx, 1.0), 0, 1)          # 1 = pure background
    alpha = 1.0 - np.clip((t - 0.25) / 0.5, 0, 1)   # soft ramp
    alpha = cv2.GaussianBlur(alpha, (3, 3), 0)
    # source videos carry 1-2px edge artifacts (thin lines) — never keep the outer border
    alpha[:4, :] = 0
    alpha[-4:, :] = 0
    alpha[:, :4] = 0
    alpha[:, -4:] = 0
    # despill: limit green to max(r, b) where partly transparent or greenish
    spill = g > np.maximum(r, b)
    g2 = np.where(spill, np.maximum(r, b) + (g - np.maximum(r, b)) * 0.15, g)
    out = np.dstack([b, g2, r, alpha * 255]).clip(0, 255).astype(np.uint8)
    return out


def place(rgba, box, scale):
    if box:
        x0, y0, x1, y1 = box
        rgba = rgba[y0:y1, x0:x1]
    h, w = rgba.shape[:2]
    s = min(W * 0.98 / w, H * scale / h)
    nw, nh = int(w * s), int(h * s)
    small = cv2.resize(rgba, (nw, nh), interpolation=cv2.INTER_AREA)
    canvas = np.zeros((H, W, 4), np.uint8)
    x, y = (W - nw) // 2, H - nh - int(H * 0.02)
    canvas[y:y + nh, x:x + nw] = small
    return canvas


def auto_box(frames, bg):
    """Union bbox of opaque pixels over all frames (padded), so crop is stable."""
    acc = None
    for im in frames[:: max(1, len(frames) // 12)]:
        a = (key(im, bg)[..., 3] > 128).astype(np.uint8)
        a[:4, :] = 0
        a[-4:, :] = 0
        a[:, :4] = 0
        a[:, -4:] = 0
        a = cv2.morphologyEx(a, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
        n, lab, st, _ = cv2.connectedComponentsWithStats(a)
        h, w = a.shape
        keep = np.zeros_like(a, bool)
        for i in range(1, n):
            if st[i][4] > h * w * 0.0008:
                keep |= lab == i
        acc = keep if acc is None else (acc | keep)
    ys, xs = np.nonzero(acc)
    pad = 16
    return [max(0, xs.min() - pad), max(0, ys.min() - pad),
            min(acc.shape[1], xs.max() + pad), min(acc.shape[0], ys.max() + pad)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("inp")
    ap.add_argument("out")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--start", type=float, default=0)
    ap.add_argument("--dur", type=float, default=0)
    ap.add_argument("--scale", type=float, default=0.92)
    ap.add_argument("--box", type=str, default="")
    ap.add_argument("--reverse", action="store_true")
    ap.add_argument("--speed", type=float, default=1.0)
    a = ap.parse_args()

    frames = read_frames(a.inp, a.start, a.dur, a.fps)
    if a.speed != 1.0:
        frames = [frames[int(i)] for i in np.arange(0, len(frames), a.speed)]
    if not frames:
        sys.exit("no frames")
    bg = bg_color(frames[0])
    box = [int(v) for v in a.box.split(",")] if a.box else auto_box(frames, bg)
    if a.reverse:
        frames = frames[::-1]
    with tempfile.TemporaryDirectory() as td:
        for i, im in enumerate(frames):
            rgba = key(im, bg)
            canvas = place(rgba, box, a.scale)
            cv2.imwrite(os.path.join(td, f"f{i:04d}.png"), canvas)
        subprocess.run([FF, "-v", "error", "-y", "-framerate", str(a.fps), "-i", os.path.join(td, "f%04d.png"),
                        "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "30",
                        "-auto-alt-ref", "0", "-row-mt", "1", a.out], check=True)
    print(a.out, len(frames), "frames", "box", box)


if __name__ == "__main__":
    main()
