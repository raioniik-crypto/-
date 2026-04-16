import "dotenv/config";
import { listQueuedJobs, findJob, moveJob } from "./jobs";
import { putFile } from "./github-store";
import { Job } from "./types";

export interface WorkerResult {
  result: "processed" | "no_job" | "error";
  job_id?: string;
  status?: string;
  artifact_paths?: string[];
  error?: string;
}

/** Pick up one queued job and execute it. */
export async function runOnce(): Promise<WorkerResult> {
  // 1. Find one queued job
  const ids = await listQueuedJobs(1);
  if (ids.length === 0) {
    console.log("[worker] No queued jobs found.");
    return { result: "no_job" };
  }
  const jobId = ids[0];
  const job = await findJob(jobId);
  if (!job || job.status !== "queued") {
    console.log(`[worker] Job ${jobId} not found or not queued, skipping.`);
    return { result: "no_job" };
  }

  console.log(`[worker] Processing ${job.job_id} (type=${job.type})`);

  // 2. Move to running
  const running = await moveJob(job, "queued", "running");

  // 3. Execute based on type
  try {
    let artifactPaths: string[];
    let summary: string;

    switch (running.type) {
      case "memo_capture":
        ({ artifactPaths, summary } = await executeMemoCapture(running));
        break;
      default:
        throw new Error(`Unsupported job type: ${running.type}`);
    }

    // 4. Move to completed
    const completed = await moveJob(running, "running", "completed", {
      result_summary: summary,
      artifact_paths: artifactPaths,
      error_message: null,
    });
    console.log(`[worker] ${completed.job_id} → completed`);
    return {
      result: "processed",
      job_id: completed.job_id,
      status: "completed",
      artifact_paths: artifactPaths,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[worker] ${running.job_id} → failed: ${msg}`);
    // 5. Move to failed
    try {
      await moveJob(running, "running", "failed", {
        result_summary: null,
        artifact_paths: [],
        error_message: msg,
      });
    } catch {
      // Best-effort; the running file still exists
    }
    return { result: "error", job_id: running.job_id, status: "failed", error: msg };
  }
}

// ============================================================
// memo_capture executor
// ============================================================

async function executeMemoCapture(
  job: Job
): Promise<{ artifactPaths: string[]; summary: string }> {
  const now = new Date();
  const isoDate = now.toISOString();
  const dateStr = isoDate.slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5).replace(":", "");

  const safeTitle = job.instruction
    .replace(/[\r\n]+/g, " ")
    .replace(/[/\\:*?"<>|]/g, "_")
    .slice(0, 60)
    .trim();
  const displayTitle = safeTitle || "memo";

  const vaultBase = process.env.GITHUB_VAULT_PATH
    ? process.env.GITHUB_VAULT_PATH.replace(/\/+$/, "") + "/"
    : "";
  const filename = `${dateStr}_${timeStr}_${displayTitle}.md`;
  const repoPath = `${vaultBase}Inbox/${filename}`;

  const nextActions = extractNextActions(job.instruction);

  const markdown = `---
title: "${displayTitle}"
created_at: "${isoDate}"
type: "memo_capture"
source: "${job.source ?? "api"}"
requested_by: "${job.requested_by ?? "unknown"}"
job_id: "${job.job_id}"
status: "completed"
---

# ${displayTitle}

## 要点
${job.instruction}

## 本文
${job.instruction}

## 次アクション
${nextActions}
`;

  await putFile(repoPath, markdown, `memo: ${displayTitle} (${job.job_id})`);

  return {
    artifactPaths: [repoPath],
    summary: `Saved memo to ${repoPath}`,
  };
}

function extractNextActions(text: string): string {
  const lines = text.split(/[\r\n]+/).filter((l) => /^[-・●]/.test(l.trim()));
  if (lines.length > 0) return lines.join("\n");
  return "なし";
}

// ============================================================
// CLI entry point: npx tsx src/worker.ts
// ============================================================

const isCli =
  process.argv[1] &&
  (process.argv[1].endsWith("worker.ts") || process.argv[1].endsWith("worker"));

if (isCli) {
  runOnce()
    .then((r) => {
      console.log(JSON.stringify(r, null, 2));
      process.exit(r.result === "error" ? 1 : 0);
    })
    .catch((err) => {
      console.error("[worker] Fatal:", err);
      process.exit(1);
    });
}
