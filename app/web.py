from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from app.main import Store, respond

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"


class Handler(BaseHTTPRequestHandler):
    store = Store.load()

    def _send(self, status: int, content_type: str, body: bytes) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        files = {"/": (WEB / "index.html", "text/html; charset=utf-8"),
                 "/styles.css": (WEB / "styles.css", "text/css; charset=utf-8"),
                 "/app.js": (WEB / "app.js", "text/javascript; charset=utf-8")}
        item = files.get(path)
        if not item:
            self._send(404, "text/plain; charset=utf-8", b"Not found")
            return
        file_path, content_type = item
        self._send(200, content_type, file_path.read_bytes())

    def do_POST(self) -> None:
        if urlparse(self.path).path != "/api/chat":
            self._send(404, "application/json", b'{"error":"Not found"}')
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 16_384:
                raise ValueError("Message size is invalid")
            payload = json.loads(self.rfile.read(length))
            message = payload.get("message", "")
            if not isinstance(message, str) or not message.strip():
                raise ValueError("Please enter a message")
            answer = respond(self.store, message.strip())
            body = json.dumps({"reply": answer}, ensure_ascii=False).encode("utf-8")
            self._send(200, "application/json; charset=utf-8", body)
        except (ValueError, json.JSONDecodeError) as error:
            body = json.dumps({"error": str(error)}, ensure_ascii=False).encode("utf-8")
            self._send(400, "application/json; charset=utf-8", body)
        except Exception:
            body = json.dumps({"error": "O atendimento está indisponível no momento."}, ensure_ascii=False).encode("utf-8")
            self._send(500, "application/json; charset=utf-8", body)

    def log_message(self, format: str, *args: object) -> None:
        print(f"[{self.log_date_time_string()}] {format % args}")


def main() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", 8000), Handler)
    print("Empório da Música web app running at http://127.0.0.1:8000")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor encerrado.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
