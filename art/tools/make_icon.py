"""Draw the Nascence emblem (∞ + compass star seal, after the reference video) as app/plugin icons.

Outputs (square PNG): art/design/icon_1024.png and copies into pet/ and skin/ at their expected names.
"""
import math
import os
import shutil

from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
S = 1024  # canvas
C = S / 2
NAVY = (9, 15, 38, 255)
NAVY2 = (17, 28, 66, 255)
WHITE = (242, 245, 255, 255)
COBALT = (79, 125, 255)


def background():
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    # rounded square with a vertical navy gradient
    grad = Image.new("RGBA", (S, S))
    gd = ImageDraw.Draw(grad)
    for y in range(S):
        t = y / S
        col = tuple(int(NAVY2[i] * (1 - t) + NAVY[i] * t) for i in range(3)) + (255,)
        gd.line([(0, y), (S, y)], fill=col)
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=255)
    im.paste(grad, (0, 0), mask)
    return im, mask


def glow(im):
    g = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(g).ellipse([C - 150, C - 150, C + 150, C + 150], fill=COBALT + (150,))
    g = g.filter(ImageFilter.GaussianBlur(70))
    im.alpha_composite(g)


def ring_and_orbit(d):
    r = S * 0.40
    d.ellipse([C - r, C - r, C + r, C + r], outline=WHITE, width=10)
    # thin tilted orbit ellipse
    pts = []
    a, b, tilt = S * 0.47, S * 0.13, math.radians(-18)
    for k in range(361):
        t = math.radians(k)
        x, y = a * math.cos(t), b * math.sin(t)
        pts.append((C + x * math.cos(tilt) - y * math.sin(tilt), C + x * math.sin(tilt) + y * math.cos(tilt)))
    d.line(pts, fill=WHITE[:3] + (200,), width=5)


def infinity(d):
    # lemniscate of Bernoulli; stroke thick on the outer lobes, thin at the crossing (calligraphic)
    a = S * 0.30
    for k in range(0, 3600):
        t = math.radians(k / 10)
        den = 1 + math.sin(t) ** 2
        x = a * math.cos(t) / den
        y = a * math.sin(t) * math.cos(t) / den
        w = 10 + 30 * abs(math.cos(t)) ** 1.5
        d.ellipse([C + x - w / 2, C + y - w / 2, C + x + w / 2, C + y + w / 2], fill=WHITE)


def star(d, im):
    # eight-point compass star: 4 long + 4 short points, dark core outline for contrast
    def pts(long_r, short_r, inner, rot=0.0):
        out = []
        for i in range(16):
            ang = math.radians(rot + i * 22.5 - 90)
            if i % 4 == 0:
                r = long_r
            elif i % 4 == 2:
                r = short_r
            else:
                r = inner
            out.append((C + r * math.cos(ang), C + r * math.sin(ang)))
        return out
    d.polygon(pts(S * 0.21, S * 0.11, S * 0.045), fill=NAVY)                      # backing
    d.polygon(pts(S * 0.18, S * 0.09, S * 0.03), fill=WHITE)                       # star
    d.ellipse([C - 14, C - 14, C + 14, C + 14], fill=COBALT + (255,))             # core


def main():
    im, mask = background()
    glow(im)
    d = ImageDraw.Draw(im)
    ring_and_orbit(d)
    infinity(d)
    star(d, im)
    out = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    out.paste(im, (0, 0), mask)
    os.makedirs(os.path.join(ROOT, "art", "design"), exist_ok=True)
    big = os.path.join(ROOT, "art", "design", "icon_1024.png")
    out.save(big)
    for rel, size in [("pet/icon.png", 256), ("skin/icon.png", 256), ("skin/src/logo-120.png", 120),
                      ("skin/src/logo-88.png", 88)]:
        p = os.path.join(ROOT, rel)
        if os.path.exists(os.path.dirname(p)):
            out.resize((size, size), Image.LANCZOS).save(p)
            print("wrote", rel, size)
    print(big)

    # transparent emblem (no tile) with soft cobalt glow, for in-UI logos
    em = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    glow(em)
    de = ImageDraw.Draw(em)
    ring_and_orbit(de)
    infinity(de)
    star(de, em)
    for rel, (w, h) in [("skin/src/icons/logo-glow.png", (69, 55)), ("skin/src/icons/guide-hero.png", (84, 74))]:
        canvas = Image.new("RGBA", (w * 8, h * 8), (0, 0, 0, 0))
        side = min(w, h) * 8
        canvas.alpha_composite(em.resize((side, side), Image.LANCZOS), ((w * 8 - side) // 2, (h * 8 - side) // 2))
        canvas.resize((w, h), Image.LANCZOS).save(os.path.join(ROOT, rel))
        print("wrote", rel, (w, h))


if __name__ == "__main__":
    main()
