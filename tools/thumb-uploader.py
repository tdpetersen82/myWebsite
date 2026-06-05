#!/usr/bin/env python3
"""Tiny localhost upload sink for game-thumbnail capture.

The capture runs in the preview browser (canvas.toDataURL -> base64) and POSTs
the base64 body here; we decode and write assets/thumbs/<id>.webp. This avoids
hand-copying multi-KB base64 strings through tool boundaries (which corrupts the
lossy webp). GET/OPTIONS get permissive CORS so the cross-origin fetch works.

Run from repo root:  python3 tools/thumb-uploader.py 9099
"""
import base64
import os
import sys
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
THUMBS = os.path.join(ROOT, "assets", "thumbs")
os.makedirs(THUMBS, exist_ok=True)
SAFE = re.compile(r"^[a-z0-9-]+$")


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self):
        # path is /save/<id>; body is base64 of the webp
        m = re.match(r"^/save/([a-z0-9-]+)$", self.path)
        if not m or not SAFE.match(m.group(1)):
            self.send_response(400)
            self._cors()
            self.end_headers()
            self.wfile.write(b"bad id")
            return
        gid = m.group(1)
        n = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(n)
        try:
            data = base64.b64decode(body, validate=True)
        except Exception as e:
            self.send_response(400)
            self._cors()
            self.end_headers()
            self.wfile.write(b"bad base64: " + str(e).encode())
            return
        out = os.path.join(THUMBS, gid + ".webp")
        with open(out, "wb") as f:
            f.write(data)
        msg = f"wrote {out} ({len(data)} bytes)"
        print(msg, flush=True)
        self.send_response(200)
        self._cors()
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(msg.encode())

    def log_message(self, *a):
        pass  # quiet


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 9099
    print(f"thumb-uploader listening on :{port}, writing to {THUMBS}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
