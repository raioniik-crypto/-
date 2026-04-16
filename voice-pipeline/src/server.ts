import "dotenv/config";
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import Busboy from "busboy";
import { runPipeline } from "./pipeline";

const PORT = parseInt(process.env.PORT || "3456", 10);

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

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/ingest") {
    let tempPath: string | null = null;
    try {
      tempPath = await receiveFile(req);
      const result = await runPipeline(tempPath);
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
  res.end(JSON.stringify({ error: "POST /ingest only" }));
});

server.listen(PORT, () => {
  console.log(`Voice pipeline server on http://localhost:${PORT}`);
  console.log("POST /ingest — multipart/form-data with 'file' field");
});
