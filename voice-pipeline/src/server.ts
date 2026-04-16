import "dotenv/config";
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import Busboy from "busboy";
import { runPipeline, getContentFingerprint } from "./pipeline";
import { validateCreateInput, createJob, findJob } from "./jobs";
import { runOnce } from "./worker";

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
// JSON body reader
// ============================================================

function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    const MAX = 1024 * 1024; // 1MB
    req.on("data", (c: Buffer) => {
      total += c.length;
      if (total > MAX) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf-8").trim();
      if (!text) return resolve(null);
      try {
        resolve(JSON.parse(text));
      } catch {
        reject(new Error("invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
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

  // POST /jobs — create a new job
  if (req.method === "POST" && req.url === "/jobs") {
    if (!checkAuth(req, res)) return;
    try {
      const body = await readJsonBody(req);
      const v = validateCreateInput(body);
      if (!v.ok) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "validation_error", field: v.field, message: v.message }));
        return;
      }
      const { job, saved_path } = await createJob(v.value);
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        result: "accepted",
        job_id: job.job_id,
        status: job.status,
        saved_path,
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const code = /invalid JSON|body too large/.test(msg) ? 400 : 500;
      res.writeHead(code, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: code === 400 ? "bad_request" : "internal_error", message: msg }));
    }
    return;
  }

  // GET /jobs/:id — lookup a job
  if (req.method === "GET" && req.url && req.url.startsWith("/jobs/")) {
    if (!checkAuth(req, res)) return;
    const jobId = req.url.slice("/jobs/".length);
    // Reject anything that isn't a safe id-looking token (no slashes, no dots, etc.)
    if (!jobId || !/^[A-Za-z0-9_-]+$/.test(jobId)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "invalid_job_id" }));
      return;
    }
    try {
      const job = await findJob(jobId);
      if (!job) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "not_found", job_id: jobId }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(job));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "internal_error", message: msg }));
    }
    return;
  }

  // POST /worker/run-once — execute one queued job
  if (req.method === "POST" && req.url === "/worker/run-once") {
    if (!checkAuth(req, res)) return;
    try {
      const result = await runOnce();
      const code = result.result === "error" ? 500 : 200;
      res.writeHead(code, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ result: "error", error: msg }));
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    error: "not_found",
    available: ["GET /health", "POST /ingest", "POST /jobs", "GET /jobs/:id", "POST /worker/run-once"],
  }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Voice pipeline server on http://0.0.0.0:${PORT}`);
  console.log("  GET  /health    — health check");
  console.log("  POST /ingest    — multipart/form-data with 'file' field");
  console.log("  POST /jobs      — create a new job (JSON body)");
  console.log("  GET  /jobs/:id  — fetch a job by id");
  console.log("  POST /worker/run-once — process one queued job");
  console.log(`  Auth: ${INGEST_API_KEY ? "Bearer token required" : "OPEN (set INGEST_API_KEY to enable)"}`);
  console.log(`  Save: GitHub Contents API → ${process.env.GITHUB_REPO || "(GITHUB_REPO not set)"}`);
});
