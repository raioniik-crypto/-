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

  // 3. Execute
  try {
    const executor = executors[running.type];
    if (!executor) throw new Error(`Unsupported job type: ${running.type}`);
    const { artifactPaths, summary } = await executor(running);

    // 4. Move to completed
    const completed = await moveJob(running, "running", "completed", {
      result_summary: summary,
      artifact_paths: artifactPaths,
      error_message: null,
    });
    console.log(`[worker] ${completed.job_id} \u2192 completed`);
    return {
      result: "processed",
      job_id: completed.job_id,
      status: "completed",
      artifact_paths: artifactPaths,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[worker] ${running.job_id} \u2192 failed: ${msg}`);
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

  const markdown = `---\ntitle: "${displayTitle}"\ncreated_at: "${isoDate}"\ntype: "memo_capture"\nsource: "${job.source ?? "api"}"\nrequested_by: "${job.requested_by ?? "unknown"}"\njob_id: "${job.job_id}"\nstatus: "completed"\n---\n\n# ${displayTitle}\n\n## \u8981\u70b9\n${job.instruction}\n\n## \u672c\u6587\n${job.instruction}\n\n## \u6b21\u30a2\u30af\u30b7\u30e7\u30f3\n${nextActions}\n`;

  await putFile(repoPath, markdown, `memo: ${displayTitle} (${job.job_id})`);

  return {
    artifactPaths: [repoPath],
    summary: `Saved memo to ${repoPath}`,
  };
}

function extractNextActions(text: string): string {
  const lines = text.split(/[\r\n]+/).filter((l) => /^[-\u30fb\u25cf]/.test(l.trim()));
  if (lines.length > 0) return lines.join("\n");
  return "\u306a\u3057";
}

// ============================================================
// Shared file path builder
// ============================================================

function buildFilePath(job: Job, type: string): { repoPath: string; safeTitle: string; isoDate: string } {
  const now = new Date();
  const isoDate = now.toISOString();
  const dateStr = isoDate.slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5).replace(":", "");
  const safeTitle = job.instruction
    .replace(/[\r\n]+/g, " ")
    .replace(/[/\\:*?"<>|]/g, "_")
    .slice(0, 50)
    .trim() || type;
  const vaultBase = process.env.GITHUB_VAULT_PATH
    ? process.env.GITHUB_VAULT_PATH.replace(/\/+$/, "") + "/"
    : "";
  const filename = `${dateStr}_${timeStr}_${type}_${safeTitle}.md`;
  const repoPath = `${vaultBase}Inbox/${filename}`;
  return { repoPath, safeTitle, isoDate };
}

// ============================================================
// dev_brief executor
// ============================================================

async function executeDevBrief(
  job: Job
): Promise<{ artifactPaths: string[]; summary: string }> {
  const { repoPath, safeTitle, isoDate } = buildFilePath(job, "dev_brief");
  const inst = job.instruction;

  const markdown = `---
title: "${safeTitle}"
created_at: "${isoDate}"
type: "dev_brief"
source: "${job.source ?? "api"}"
requested_by: "${job.requested_by ?? "unknown"}"
job_id: "${job.job_id}"
status: "completed"
generation_mode: "template"
---

# 開発ブリーフ

## 概要
${inst}

## 目的
（${safeTitle} の目的をここに記載）

## やること
- [ ] 要件を整理する
- [ ] 実装する
- [ ] 動作確認する

## 入力
- 指示内容: ${inst}

## 出力
- 成果物の定義をここに記載

## 制約
- 既存機能を壊さないこと
- 最小変更で対応すること

## 実装メモ
（実装時の補足をここに記載）

## 確認手順
- [ ] ローカルで動作確認
- [ ] 本番反映後の確認
`;

  await putFile(repoPath, markdown, `dev_brief: ${safeTitle} (${job.job_id})`);
  return { artifactPaths: [repoPath], summary: `Saved dev_brief to ${repoPath}` };
}

// ============================================================
// content_draft executor
// ============================================================

async function executeContentDraft(
  job: Job
): Promise<{ artifactPaths: string[]; summary: string }> {
  const { repoPath, safeTitle, isoDate } = buildFilePath(job, "content_draft");
  const inst = job.instruction;

  const markdown = `---
title: "${safeTitle}"
created_at: "${isoDate}"
type: "content_draft"
source: "${job.source ?? "api"}"
requested_by: "${job.requested_by ?? "unknown"}"
job_id: "${job.job_id}"
status: "completed"
generation_mode: "template"
---

# コンテンツ下書き

## 依頼概要
${inst}

## 投稿案1
（依頼内容をもとにした投稿案をここに記載）

## 投稿案2
（別の切り口での投稿案をここに記載）

## 短文版
（SNS向け短文版をここに記載）

## ハッシュタグ案
#

## メモ
- 元の指示: ${inst}
`;

  await putFile(repoPath, markdown, `content_draft: ${safeTitle} (${job.job_id})`);
  return { artifactPaths: [repoPath], summary: `Saved content_draft to ${repoPath}` };
}

// saveSimpleMarkdown is kept as fallback for future executor types
async function saveSimpleMarkdown(
  job: Job,
  type: string
): Promise<{ artifactPaths: string[]; summary: string }> {
  const now = new Date();
  const isoDate = now.toISOString();
  const dateStr = isoDate.slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5).replace(":", "");

  const safeTitle = job.instruction
    .replace(/[\r\n]+/g, " ")
    .replace(/[/\\:*?"<>|]/g, "_")
    .slice(0, 50)
    .trim() || type;

  const vaultBase = process.env.GITHUB_VAULT_PATH
    ? process.env.GITHUB_VAULT_PATH.replace(/\/+$/, "") + "/"
    : "";
  const filename = `${dateStr}_${timeStr}_${type}_${safeTitle}.md`;
  const repoPath = `${vaultBase}Inbox/${filename}`;

  const markdown = `---
title: "${safeTitle}"
created_at: "${isoDate}"
type: "${type}"
source: "${job.source ?? "api"}"
requested_by: "${job.requested_by ?? "unknown"}"
job_id: "${job.job_id}"
status: "completed"
---

# ${safeTitle}

## 指示内容
${job.instruction}

## 本文
${job.instruction}
`;

  await putFile(repoPath, markdown, `${type}: ${safeTitle} (${job.job_id})`);

  return {
    artifactPaths: [repoPath],
    summary: `Saved ${type} to ${repoPath}`,
  };
}

// ============================================================
// Executor registry
// ============================================================

type JobExecutor = (job: Job) => Promise<{ artifactPaths: string[]; summary: string }>;

const executors: Record<string, JobExecutor> = {
  memo_capture: executeMemoCapture,
  dev_brief: executeDevBrief,
  content_draft: executeContentDraft,
};

// ============================================================
// Loop mode
// ============================================================

const POLL_MS = parseInt(process.env.WORKER_POLL_INTERVAL_MS || "60000", 10);
const LOG_NO_JOB = process.env.WORKER_LOG_NO_JOB === "true";

let stopping = false;
let busy = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runLoop(): Promise<void> {
  console.log(`[worker:loop] Started \u2014 polling every ${POLL_MS}ms`);

  while (!stopping) {
    busy = true;
    try {
      const r = await runOnce();
      if (r.result === "processed") {
        console.log(`[worker:loop] Processed ${r.job_id} \u2192 ${r.status}`);
      } else if (r.result === "error") {
        console.error(`[worker:loop] Error on ${r.job_id}: ${r.error}`);
      } else if (LOG_NO_JOB) {
        console.log("[worker:loop] No queued jobs.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[worker:loop] Unexpected error: ${msg}`);
    }
    busy = false;

    if (stopping) break;

    // Interruptible sleep: check stopping every second
    const rounds = Math.ceil(POLL_MS / 1000);
    for (let i = 0; i < rounds && !stopping; i++) {
      await sleep(Math.min(1000, POLL_MS));
    }
  }

  console.log("[worker:loop] Stopped.");
}

// ============================================================
// Graceful shutdown
// ============================================================

function handleSignal(signal: string) {
  if (stopping) return; // already stopping
  console.log(`[worker] Received ${signal}, shutting down${busy ? " after current job..." : "..."}`);
  stopping = true;
}

process.on("SIGINT", () => handleSignal("SIGINT"));
process.on("SIGTERM", () => handleSignal("SIGTERM"));

// ============================================================
// CLI entry point
// ============================================================

const isCli =
  process.argv[1] &&
  (process.argv[1].endsWith("worker.ts") || process.argv[1].endsWith("worker"));

if (isCli) {
  const isLoop = process.argv.includes("--loop");

  if (isLoop) {
    runLoop().catch((err) => {
      console.error("[worker:loop] Fatal:", err);
      process.exit(1);
    });
  } else {
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
}
