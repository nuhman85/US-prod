"""Small local HTTP service for semantic product-title similarity."""

import json
import os
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from sentence_transformers import SentenceTransformer


MODEL_NAME = os.getenv("SEMANTIC_MODEL", "all-MiniLM-L6-v2")
PORT = int(os.getenv("SEMANTIC_MATCHER_PORT", "4010"))
MODEL = SentenceTransformer(MODEL_NAME)


def preprocess(value):
    value = str(value or "").lower().replace("-", " ")
    value = re.sub(r"[^a-z0-9\s]", " ", value)
    ignored = {"the", "and", "with", "for", "a", "an", "new"}
    return " ".join(word for word in value.split() if word not in ignored)


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != "/health":
            self.send_error(404)
            return
        self.send_json(200, {"ok": True, "model": MODEL_NAME})

    def do_POST(self):
        if self.path != "/score":
            self.send_error(404)
            return
        try:
            length = min(int(self.headers.get("content-length", "0")), 1_000_000)
            payload = json.loads(self.rfile.read(length))
            master = preprocess(payload.get("master"))
            candidates = payload.get("candidates", [])[:500]
            if not master or not candidates:
                self.send_json(200, {"scores": []})
                return

            texts = [master] + [preprocess(item.get("title")) for item in candidates]
            embeddings = MODEL.encode(texts, normalize_embeddings=True)
            master_embedding = embeddings[0]
            scores = []
            for item, embedding in zip(candidates, embeddings[1:]):
                score = float(master_embedding @ embedding)
                scores.append({"id": str(item.get("id")), "score": max(0.0, min(1.0, score))})
            self.send_json(200, {"scores": scores, "model": MODEL_NAME})
        except (ValueError, TypeError, json.JSONDecodeError) as error:
            self.send_json(400, {"error": str(error)})

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, message, *args):
        print(f"semantic-matcher: {message % args}")


if __name__ == "__main__":
    print(f"Semantic matcher ({MODEL_NAME}) listening on http://127.0.0.1:{PORT}")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
