"""Render promo/src/film.html to a JPEG frame sequence (or stills).

The film page exposes `window.seek(t)` (deterministic: no CSS animations, every
property is computed from t) and `window.ready`. One frame = seek + screenshot,
so the result is frame-exact and reproducible.

Usage:
  python render.py --still 1.0,4.2,9.0          # a few preview stills
  python render.py --out frames --fps 30        # full film frames
"""

import argparse
import os
import sys
import time

from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://127.0.0.1:8917/promo/src/"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(HERE, "frames"))
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--start", type=float, default=0.0)
    ap.add_argument("--end", type=float, default=52.0)
    ap.add_argument("--still", default="")
    ap.add_argument("--quality", type=int, default=95)
    ap.add_argument("--page", default="film.html")
    ap.add_argument("--w", type=int, default=1920)
    ap.add_argument("--h", type=int, default=1080)
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--force-color-profile=srgb", "--disable-lcd-text"])
        page = browser.new_page(viewport={"width": args.w, "height": args.h}, device_scale_factor=1)
        page.goto(BASE + args.page, wait_until="load")
        page.wait_for_function("window.ready !== undefined", timeout=30000)
        ok = page.evaluate("() => window.ready")
        print("videos ready:", ok, flush=True)
        page.wait_for_timeout(300)

        if args.still:
            for raw in args.still.split(","):
                t = float(raw)
                page.evaluate("t => window.seek(t)", t)
                path = os.path.join(args.out, f"still_{t:06.2f}.jpg")
                page.screenshot(path=path, type="jpeg", quality=args.quality)
                print("still", t, path, flush=True)
        else:
            n = int(round((args.end - args.start) * args.fps))
            t0 = time.time()
            for i in range(n):
                t = args.start + i / args.fps
                page.evaluate("t => window.seek(t)", t)
                page.screenshot(path=os.path.join(args.out, f"f_{i:05d}.jpg"),
                                type="jpeg", quality=args.quality)
                if i % 60 == 0:
                    el = time.time() - t0
                    print(f"frame {i}/{n}  {el:6.1f}s  {el / (i + 1):.3f}s/frame", flush=True)
            print(f"done {n} frames in {time.time() - t0:.1f}s", flush=True)

        browser.close()


if __name__ == "__main__":
    sys.exit(main())
