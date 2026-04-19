import "dotenv/config";
import { getFile, putFile, listDir, deleteFile } from "./github-store";
import { ROUTINE_REGISTRY } from "./routines";
import { runClaudeCode } from "./claude_code_runner";
import { acquireLock, releaseLock } from "./supabase_locks";
import { getWorkspacePath, shallowClone, cleanupWorkspace } from "./git_ops";
import { RoutineJob } from "./types";

const POLL_MS = parseInt(process.env.ROUTINE_WORKER_POLL_INTERVAL_MS || "60000", 10);
const LOG_NO_JOB = process.env.ROUTINE_WORKER_LOG_NO_JOB === "true";
const WORKER_ID = process.env.RENDER_INSTANCE_ID || `local-${process.pid}`;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

let stopping = false;
let busy = false;

// ============================================================
// Job ledger helpers (routine-specific, uses existing github-store)
// ============================================================

const ROUTINE_TYPES = Object.keys(ROUTINE_REGISTRY);

async function findNextRoutineJob(): Promise<RoutineJob | null> {
  const files = await listDir("system/routine_jobs/queued");
  for (const f of files.filter((n) => n.endsWith(".json"))) {
    const content = await getFile(`system/routine_jobs/queued/${f}`);
    if (!content) continue;
    try {
      const job = JSON.parse(content) as RoutineJob;
      if (ROUTINE_TYPES.includes(job.type)) return job;
    } catch { /* skip malformed */ }
  }
  return null;
}

async function moveRoutineJob(
  job: RoutineJob,
  from: string,
  to: string,
  updates: { result_summary?: string | null; artifact_paths?: string[]; error_message?: string | null } = {}
): Promise<RoutineJob> {
  const updated: RoutineJob = {
    ...job,
    ...updates,
    status: to as RoutineJob["status"],
    updated_at: new Date().toISOString(),
  };
  const newPath = `system/routine_jobs/${to}/${job.job_id}.json`;
  await putFile(newPath, JSON.stringify(updated, null, 2), `routine: ${from} → ${to} ${job.job_id}`);
  // Best-effort delete old
  try {
    await deleteFile(`system/routine_jobs/${from}/${job.job_id}.json`, `routine: cleanup ${from}/${job.job_id}`);
  } catch { /* non-fatal */ }
  return updated;
}

// ============================================================
// Scope builder
// ============================================================

function buildScope(job: RoutineJob): string {
  const args = job.args as { repo?: string; branch?: string; path?: string };
  let scope = `routine:${job.type}`;
  if (args.repo) scope += `:repo:${args.repo}`;
  if (args.branch) scope += `:branch:${args.branch}`;
  if (args.path) scope += `:path:${args.path}`;
  return scope;
}

// ============================================================
// Vault save
// ============================================================

async function saveResultToVault(
  job: RoutineJob,
  resultText: string
): Promise<string[]> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
  const args = job.args as { repo?: string };
  const repoShort = (args.repo ?? "unknown").replace(/[/\\:*?"<>|]/g, "_").slice(0, 30);

  const vaultBase = process.env.GITHUB_VAULT_PATH
    ? process.env.GITHUB_VAULT_PATH.replace(/\/+$/, "") + "/"
    : "";

  const folderMap: Record<string, string> = {
    code_review: "03_開発/Code Reviews",
  };
  const folder = folderMap[job.type] || "03_開発/Routine Results";
  const filename = `${dateStr}_${timeStr}_${job.type}_${repoShort}.md`;
  const repoPath = `${vaultBase}${folder}/${filename}`;

  const frontmatter = `---
type: ${job.type}-result
routine: ${job.type}
job_id: "${job.job_id}"
created: "${now.toISOString()}"
tags: [スマホ司令塔, ${job.type}]
---

`;

  await putFile(repoPath, frontmatter + resultText, `routine: ${job.type} result (${job.job_id})`);
  return [repoPath];
}

// ============================================================
// Run once
// ============================================================

export async function runOnce(): Promise<{ result: "processed" | "no_job" | "error"; job_id?: string; error?: string }> {
  const routineJob = await findNextRoutineJob();
  if (!routineJob) {
    if (LOG_NO_JOB) console.log("[routine-worker] No queued routine jobs.");
    return { result: "no_job" };
  }

  const handler = ROUTINE_REGISTRY[routineJob.type];
  if (!handler) return { result: "no_job" };

  console.log(`[routine-worker] Processing ${routineJob.job_id} (type=${routineJob.type})`);

  // Acquire lock
  const scope = buildScope(routineJob);
  const lock = await acquireLock(scope, routineJob.type, routineJob.job_id, WORKER_ID, Math.ceil(handler.max_duration_ms / 1000));
  if (!lock.success) {
    console.log(`[routine-worker] Lock busy for scope=${scope}, skipping`);
    return { result: "no_job" };
  }

  // queued -> running
  let running: RoutineJob;
  try {
    running = await moveRoutineJob(routineJob, "queued", "running");
  } catch (err: unknown) {
    await releaseLock(scope, routineJob.job_id).catch(() => {});
    const msg = err instanceof Error ? err.message : String(err);
    return { result: "error", job_id: routineJob.job_id, error: msg };
  }

  try {
    // Prepare workspace
    const workspace = getWorkspacePath(routineJob.job_id);
    const args = routineJob.args as { repo?: string; target?: string };

    if (args.repo) {
      const branchFromArgs = (args as { branch?: string }).branch;
      await shallowClone(args.repo, workspace, branchFromArgs);
    }

    // Run Claude Code
    const result = await runClaudeCode({
      cwd: args.repo ? workspace : process.cwd(),
      systemPrompt: handler.system_prompt,
      userPrompt: handler.build_prompt(routineJob),
      maxDurationMs: handler.max_duration_ms,
      jobId: routineJob.job_id,
    });

    // Timeout
    if (result.timedOut) {
      await moveRoutineJob(running, "running", "failed", {
        result_summary: null,
        artifact_paths: [],
        error_message: "Routine timed out",
      });
      return { result: "error", job_id: routineJob.job_id, error: "timeout" };
    }

    // Blocked (finalResult.status === "blocked")
    if (result.finalResult?.status === "blocked") {
      const fr = result.finalResult;
      await moveRoutineJob(running, "running", "waiting_approval", {
        result_summary: `[BLOCKED] ${fr.blocker_type ?? "unknown"}: ${fr.reason ?? ""}`,
        artifact_paths: fr.partial_results ?? [],
        error_message: null,
      });
      console.log(`[routine-worker] ${routineJob.job_id} → blocked (${fr.blocker_type})`);
      return { result: "processed", job_id: routineJob.job_id };
    }

    // Failed via finalResult
    if (result.finalResult?.status === "failed") {
      const fr = result.finalResult;
      await moveRoutineJob(running, "running", "failed", {
        result_summary: `[FAILED] ${fr.error_type ?? "unknown"}`,
        artifact_paths: [],
        error_message: fr.error_message ?? "unknown error",
      });
      return { result: "error", job_id: routineJob.job_id, error: fr.error_message ?? "failed" };
    }

    // Completed via finalResult or fallback
    let resultText = "";
    let summary = "";

    if (result.finalResult?.status === "completed") {
      const fr = result.finalResult;
      resultText = fr.result_markdown ?? "";
      summary = fr.summary ?? `${routineJob.type} completed`;
    } else if (result.resultJson) {
      const rj = result.resultJson as { result?: string; subtype?: string };
      resultText = typeof rj.result === "string" ? rj.result : result.rawStdout;
      summary = rj.subtype === "success"
        ? `${routineJob.type} completed (legacy: no status field)`
        : `${routineJob.type} finished: ${rj.subtype ?? "unknown"}`;
    } else {
      resultText = result.rawStdout;
      summary = result.exitCode === 0
        ? `${routineJob.type} completed (plain text)`
        : `${routineJob.type} failed (exit ${result.exitCode})`;
    }

    // Exit non-0 fallback (only when no finalResult)
    if (result.exitCode !== 0 && result.exitCode !== null && !result.finalResult) {
      await moveRoutineJob(running, "running", "failed", {
        result_summary: summary,
        artifact_paths: [],
        error_message: `Exit code ${result.exitCode}: ${result.rawStderr.slice(0, 300)}`,
      });
      return { result: "error", job_id: routineJob.job_id, error: summary };
    }

    // Save to vault & -> completed
    const savedPaths = await saveResultToVault(routineJob, resultText);
    await moveRoutineJob(running, "running", "completed", {
      result_summary: summary,
      artifact_paths: savedPaths,
      error_message: null,
    });
    console.log(`[routine-worker] ${routineJob.job_id} → completed`);
    return { result: "processed", job_id: routineJob.job_id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[routine-worker] ${running.job_id} → failed: ${msg}`);
    try {
      await moveRoutineJob(running, "running", "failed", {
        result_summary: null,
        artifact_paths: [],
        error_message: msg,
      });
    } catch { /* best-effort */ }
    return { result: "error", job_id: routineJob.job_id, error: msg };
  } finally {
    await releaseLock(scope, routineJob.job_id).catch(() => {});
    await cleanupWorkspace(getWorkspacePath(routineJob.job_id)).catch(() => {});
  }
}

// ============================================================
// Loop mode
// ============================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runLoop(): Promise<void> {
  console.log(`[routine-worker:loop] Started — polling every ${POLL_MS}ms`);

  while (!stopping) {
    busy = true;
    try {
      const r = await runOnce();
      if (r.result === "processed") {
        console.log(`[routine-worker:loop] Processed ${r.job_id}`);
      } else if (r.result === "error") {
        console.error(`[routine-worker:loop] Error: ${r.error}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[routine-worker:loop] Unexpected: ${msg}`);
    }
    busy = false;

    if (stopping) break;
    const rounds = Math.ceil(POLL_MS / 1000);
    for (let i = 0; i < rounds && !stopping; i++) {
      await sleep(Math.min(1000, POLL_MS));
    }
  }
  console.log("[routine-worker:loop] Stopped.");
}

// ============================================================
// Graceful shutdown
// ============================================================

function handleSignal(signal: string) {
  if (stopping) return;
  console.log(`[routine-worker] Received ${signal}, shutting down${busy ? " after current job..." : "..."}`);
  stopping = true;
}

process.on("SIGINT", () => handleSignal("SIGINT"));
process.on("SIGTERM", () => handleSignal("SIGTERM"));

// ============================================================
// CLI entry
// ============================================================

const isCli = process.argv[1] &&
  (process.argv[1].endsWith("routine-worker.ts") || process.argv[1].endsWith("routine-worker"));

if (isCli) {
  const isLoop = process.argv.includes("--loop");
  if (isLoop) {
    runLoop().catch((err) => {
      console.error("[routine-worker:loop] Fatal:", err);
      process.exit(1);
    });
  } else {
    runOnce()
      .then((r) => {
        console.log(JSON.stringify(r, null, 2));
        process.exit(r.result === "error" ? 1 : 0);
      })
      .catch((err) => {
        console.error("[routine-worker] Fatal:", err);
        process.exit(1);
      });
  }
}
