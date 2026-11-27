"""One row per clip, N frames each. Usage: multi_sheet.py OUT.jpg N clip1.mp4 clip2.mp4 ..."""
import sys
import cv2
import numpy as np

out, n, clips = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
rows = []
for c in clips:
    cap = cv2.VideoCapture(c)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 24
    cells = []
    for k in np.linspace(0, total - 1, n).astype(int):
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(k))
        ok, im = cap.read()
        if not ok:
            im = np.zeros((720, 1280, 3), np.uint8)
        im = im[:, 280:1000]  # center crop around the character
        im = cv2.resize(im, (200, 200))
        cv2.putText(im, f"{k / fps:.1f}", (4, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
        cells.append(im)
    label = np.zeros((200, 90, 3), np.uint8)
    cv2.putText(label, c.split('/')[-1].split('\\')[-1][:10], (4, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
    rows.append(np.hstack([label] + cells))
cv2.imwrite(out, np.vstack(rows))
print(out)
