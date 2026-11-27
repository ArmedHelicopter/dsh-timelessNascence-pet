"""Make a frame contact sheet of a clip (for quick review). Usage: contact_sheet.py IN.mp4 OUT.jpg [n=12]"""
import sys
import cv2
import numpy as np

inp, out = sys.argv[1], sys.argv[2]
n = int(sys.argv[3]) if len(sys.argv) > 3 else 12
cap = cv2.VideoCapture(inp)
total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
fps = cap.get(cv2.CAP_PROP_FPS)
frames = []
for k in np.linspace(0, total - 1, n).astype(int):
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(k))
    ok, im = cap.read()
    if not ok:
        continue
    im = cv2.resize(im, (320, int(320 * im.shape[0] / im.shape[1])))
    cv2.putText(im, f"{k / fps:.2f}s", (6, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
    frames.append(im)
cols = 4
rows = [np.hstack(frames[i:i + cols] + [np.zeros_like(frames[0])] * (cols - len(frames[i:i + cols])))
        for i in range(0, len(frames), cols)]
cv2.imwrite(out, np.vstack(rows))
print(out, total, "frames", round(total / fps, 2), "s", fps, "fps")
