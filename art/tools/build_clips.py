"""Render all 12 pet clips from the Flow source videos with one shared crop box.

Sources live in art/sources/*.mp4 (green screen, 1280x720). Output: pet/assets/video/*.webm
"""
import os
import subprocess
import sys

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ART = os.path.dirname(HERE)
ROOT = os.path.dirname(ART)
SRC = os.path.join(ART, "sources")
OUT = os.path.join(ROOT, "pet", "assets", "video")
sys.path.insert(0, HERE)
import render_clip as rc  # noqa: E402

# name: (source, start, dur, speed, reverse)
CLIPS = {
    "idle":        ("idle.mp4",        3.6, 4.3, 1.0, False),
    "happy":       ("happy.mp4",       0,   0,   2.0, False),
    "talk":        ("talk.mp4",        0,   0,   1.6, False),
    "interact_1":  ("interact_1.mp4",  0,   0,   2.0, False),
    "interact_2":  ("interact_2.mp4",  0,   0,   2.0, False),
    "celebrate":   ("celebrate.mp4",   0,   0,   2.0, False),
    "sad_begin":   ("sad_begin.mp4",   0,   0,   3.0, False),
    "sad_idle":    ("sad_idle.mp4",    0,   0,   2.0, False),
    "sad_exit":    ("sad_begin.mp4",   0,   0,   3.0, True),
    "think_begin": ("think_begin.mp4", 0,   0,   3.0, False),
    "think_idle":  ("think_idle.mp4",  0,   0,   2.0, False),
    "think_exit":  ("think_begin.mp4", 0,   0,   3.0, True),
}


def union_box():
    boxes = []
    for src in sorted(set(v[0] for v in CLIPS.values())):
        frames = rc.read_frames(os.path.join(SRC, src), 0, 0, 30)
        boxes.append(rc.auto_box(frames, rc.bg_color(frames[0])))
    b = np.array(boxes)
    return [int(b[:, 0].min()), int(b[:, 1].min()), int(b[:, 2].max()), int(b[:, 3].max())]


def main():
    os.makedirs(OUT, exist_ok=True)
    box = union_box()
    print("shared box", box)
    only = set(sys.argv[1:])
    for name, (src, start, dur, speed, rev) in CLIPS.items():
        if only and name not in only:
            continue
        cmd = [sys.executable, os.path.join(HERE, "render_clip.py"), os.path.join(SRC, src),
               os.path.join(OUT, name + ".webm"), "--box", ",".join(map(str, box)),
               "--start", str(start), "--dur", str(dur), "--speed", str(speed)]
        if rev:
            cmd.append("--reverse")
        subprocess.run(cmd, check=True)


if __name__ == "__main__":
    main()
