import "dotenv/config";
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import Busboy from "busboy";
import { runPipeline, getContentFingerprint } from "./pipeline";

const PORT = parseInt(process.env.PORT || "3456", 10);
const INGEST_API_KEY = process.env.INGEST_API_KEY || "";

// ============================================================
// Auth
// ============================================================

function checkAuth(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  if (!INGEST_API_KEY) return true; // no key configured = open
  const header = req.headers.authorization || "";
  if (header === `Bearer ${INGEST_API_KEY}`) return true;
  res.writeHead(401, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Unauthorized" }));
  return false;
}

// ============================================================
// File upload
// ============================================================

function receiveFile(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    let fileReceived = false;

    busboy.on("file", (_fieldname, stream, info) => {
      fileReceived = true;
      const ext = path.extname(info.filename || "") || ".m4a";
      const tempPath = path.join(os.tmpdir(), `voice-${Date.now()}${ext}`);
      const ws = fs.createWriteStream(tempPath);
      stream.pipe(ws);
      ws.on("close", () => resolve(tempPath));
      ws.on("error", reject);
    });

    busboy.on("finish", () => {
      if (!fileReceived) reject(new Error("No file field in request"));
    });
    busboy.on("error", reject);
    req.pipe(busboy);
  });
}

// ============================================================
// Routes
// ============================================================

const server = http.createServer(async (req, res) => {
  // GET /health — no auth required
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", save_target: "github_contents_api" }));
    return;
  }

  // POST /ingest — auth required
  if (req.method === "POST" && req.url === "/ingest") {
    if (!checkAuth(req, res)) return;

    let tempPath: string | null = null;
    try {
      tempPath = await receiveFile(req);
      const contentFingerprint = getContentFingerprint(tempPath);
      const result = await runPipeline(tempPath, { contentFingerprint });
      const status = result.result === "failed" ? 500 : 200;
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ result: "failed", error: msg }));
    } finally {
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "POST /ingest or GET /health" }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Voice pipeline server on http://0.0.0.0:${PORT}`);
  console.log("  GET  /health — health check");
  console.log("  POST /ingest — multipart/form-data with 'file' field");
  console.log(`  Auth: ${INGEST_API_KEY ? "Bearer token required" : "OPEN (set INGEST_API_KEY to enable)"}`);
  console.log(`  Save: GitHub Contents API → ${process.env.GITHUB_REPO || "(GITHUB_REPO not set)"}`);
});
