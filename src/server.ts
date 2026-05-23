import "dotenv/config";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeFlow } from "./flows/analyzeFlow.js";
import { creditCheckFlow } from "./flows/creditCheckFlow.js";
import { creditHoldAnalysisFlow } from "./flows/creditHoldAnalysisFlow.js";

const PORT = parseInt(process.env.PORT ?? "8080", 10);

// ── Static file serving (production: frontend is built into ./public) ─────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const PUBLIC_EXISTS = fs.existsSync(PUBLIC_DIR);

const MIME: Record<string, string> = {
  ".html":  "text/html; charset=utf-8",
  ".js":    "application/javascript",
  ".css":   "text/css",
  ".json":  "application/json",
  ".ico":   "image/x-icon",
  ".png":   "image/png",
  ".jpg":   "image/jpeg",
  ".svg":   "image/svg+xml",
  ".woff":  "font/woff",
  ".woff2": "font/woff2",
};

function serveStatic(res: http.ServerResponse, urlPath: string): boolean {
  if (!PUBLIC_EXISTS) return false;

  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  let filePath = path.join(PUBLIC_DIR, safePath || "index.html");

  if (!filePath.startsWith(PUBLIC_DIR)) return false; // path-traversal guard

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    // SPA fallback: non-asset paths render index.html
    if (!path.extname(urlPath)) {
      filePath = path.join(PUBLIC_DIR, "index.html");
    } else {
      return false;
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] ?? "application/octet-stream";
  const isHtml = ext === ".html";

  res.writeHead(200, {
    "Content-Type": mime,
    "Cache-Control": isHtml ? "no-cache" : "public, max-age=31536000, immutable",
  });
  res.end(fs.readFileSync(filePath));
  return true;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
  });
}

function send(res: http.ServerResponse, status: number, data: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(data, null, 2));
}

// ── Request handler ───────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url = req.url ?? "/";

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && url === "/health") {
    send(res, 200, { status: "ok", timestamp: new Date().toISOString() });
    return;
  }

  if (req.method === "POST" && url === "/analyze") {
    const body = await readBody(req);
    try {
      const payload = JSON.parse(body) as Record<string, unknown>;
      if (!payload.text || typeof payload.text !== "string") {
        send(res, 400, { error: "'text' field (string) is required" });
        return;
      }
      const result = await analyzeFlow({
        text: payload.text,
        context: typeof payload.context === "string" ? payload.context : undefined,
      });
      send(res, 200, result);
    } catch (err) {
      console.error("[/analyze] Error:", err);
      send(res, 500, { error: String(err) });
    }
    return;
  }

  if (req.method === "POST" && url === "/credit-check") {
    const body = await readBody(req);
    try {
      const payload = JSON.parse(body) as Record<string, unknown>;
      const amount = Number(payload.requestedAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        send(res, 400, { error: "'requestedAmount' must be a positive number" });
        return;
      }
      const result = await creditCheckFlow({ requestedAmount: amount });
      send(res, 200, result);
    } catch (err) {
      console.error("[/credit-check] Error:", err);
      send(res, 500, { error: String(err) });
    }
    return;
  }

  if (req.method === "POST" && url === "/credit-hold-analysis") {
    const body = await readBody(req);
    try {
      const payload = JSON.parse(body) as Record<string, unknown>;
      if (!payload.email_body || typeof payload.email_body !== "string") {
        send(res, 400, { error: "'email_body' field (string) is required" });
        return;
      }
      const result = await creditHoldAnalysisFlow({ email_body: payload.email_body });
      send(res, 200, result);
    } catch (err) {
      console.error("[/credit-hold-analysis] Error:", err);
      send(res, 500, { error: String(err) });
    }
    return;
  }

  // Serve frontend static files (production only)
  if (req.method === "GET" && serveStatic(res, url)) return;

  send(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (PUBLIC_EXISTS) console.log(`  Serving frontend from ./public`);
  console.log(`  POST /analyze`);
  console.log(`  POST /credit-check`);
  console.log(`  POST /credit-hold-analysis`);
  console.log(`  GET  /health`);
});
