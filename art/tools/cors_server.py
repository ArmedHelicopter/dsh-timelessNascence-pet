"""Tiny localhost file server with CORS + a POST /upload receiver.

The Flow page cannot fetch localhost (CSP), but it can submit a form here.
POST /upload  (application/x-www-form-urlencoded)
  fields: name_<i>=<file name>, data_<i>=<base64 or data: URL>
Files are written to art/inbox/.
"""
import base64
import http.server
import os
import sys
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INBOX = os.path.join(ROOT, "inbox")


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Methods", "GET, POST")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def do_POST(self):
        if self.path.split("?")[0] != "/upload":
            self.send_error(404)
            return
        n = int(self.headers.get("Content-Length", 0))
        q = urllib.parse.parse_qs(self.rfile.read(n).decode("ascii", "replace"))
        os.makedirs(INBOX, exist_ok=True)
        saved = []
        for key in sorted(k for k in q if k.startswith("data_")):
            idx = key[5:]
            name = os.path.basename(q.get("name_" + idx, [f"file_{idx}.bin"])[0])
            data = q[key][0]
            if data.startswith("data:"):
                data = data.split(",", 1)[1]
            raw = base64.b64decode(data)
            with open(os.path.join(INBOX, name), "wb") as f:
                f.write(raw)
            saved.append(f"{name} {len(raw)}")
        body = ("saved:\n" + "\n".join(saved)).encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    http.server.ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
