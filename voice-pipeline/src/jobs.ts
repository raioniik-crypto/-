import { randomUUID } from "crypto";
import { putFile, getFile, deleteFile, listDir } from "./github-store";
import { Job, JobStatus, JobType, CreateJobInput } from "./types";

const VALID_TYPES: JobType[] = ["memo_capture", "content_draft", "dev_brief", "x_post", "instagram_caption"];

// Searched in this order when looking up a job by id.
const SEARCH_STATUSES: JobStatus[] = [
  "queued",
  "running",
  "waiting_approval",
  "completed",
  "failed",
  "cancelled",
];

function generateJobId(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear().toString();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const rand = randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  return `JOB-${yyyy}${mm}${dd}-${rand}`;
}

function jobPath(status: JobStatus, jobId: string): string {
  return `system/jobs/${status}/${jobId}.json`;
}

export type ValidationResult =
  | { ok: true; value: CreateJobInput }
  | { ok: false; field: string; message: string };

export function validateCreateInput(input: unknown): ValidationResult {
  if (!input || typeof input !== "object") {
    return { ok: false, field: "body", message: "JSON body required" };
  }
  const o = input as Record<string, unknown>;

  if (typeof o.type !== "string") {
    return { ok: false, field: "type", message: "type is required (string)" };
  }
  if (!VALID_TYPES.includes(o.type as JobType)) {
    return {
      ok: false,
      field: "type",
      message: `type must be one of: ${VALID_TYPES.join(", ")}`,
    };
  }
  if (typeof o.instruction !== "string" || o.instruction.trim() === "") {
    return {
      ok: false,
      field: "instruction",
      message: "instruction is required and must be a non-empty string",
    };
  }

  const value: CreateJobInput = {
    type: o.type as JobType,
    instruction: o.instruction,
  };
  if (typeof o.source === "string") value.source = o.source;
  if (typeof o.requested_by === "string") value.requested_by = o.requested_by;
  if (o.metadata && typeof o.metadata === "object" && !Array.isArray(o.metadata)) {
    value.metadata = o.metadata as Record<string, unknown>;
  }
  return { ok: true, value };
}

export async function createJob(
  input: CreateJobInput
): Promise<{ job: Job; saved_path: string }> {
  const now = new Date().toISOString();
  const job: Job = {
    job_id: generateJobId(),
    type: input.type,
    instruction: input.instruction,
    source: input.source ?? null,
    requested_by: input.requested_by ?? null,
    metadata: input.metadata ?? {},
    status: "queued",
    created_at: now,
    updated_at: now,
    save_target: "github_contents_api",
    result_summary: null,
    artifact_paths: [],
    error_message: null,
  };

  const savedPath = jobPath("queued", job.job_id);
  await putFile(savedPath, JSON.stringify(job, null, 2), `job: create ${job.job_id}`);
  return { job, saved_path: savedPath };
}

/**
 * Search all status folders for a job. If the same job_id exists in
 * multiple folders (e.g. DELETE failed during moveJob), return the
 * one with the newest updated_at. On tie, prefer later status.
 */
export async function findJob(jobId: string): Promise<Job | null> {
  let best: Job | null = null;
  let bestIdx = -1;
  for (let i = 0; i < SEARCH_STATUSES.length; i++) {
    const content = await getFile(jobPath(SEARCH_STATUSES[i], jobId));
    if (content === null) continue;
    const job = JSON.parse(content) as Job;
    if (!best) {
      best = job;
      bestIdx = i;
      continue;
    }
    // Prefer newer updated_at; on tie prefer later status index
    if (job.updated_at > best.updated_at || (job.updated_at === best.updated_at && i > bestIdx)) {
      best = job;
      bestIdx = i;
    }
  }
  return best;
}

/** List jobs, optionally filtered by status, sorted by updated_at desc. */
export async function listJobs(opts: { status?: string; limit?: number } = {}): Promise<Job[]> {
  const limit = Math.min(Math.max(opts.limit ?? 5, 1), 20);
  const statuses: JobStatus[] = opts.status && SEARCH_STATUSES.includes(opts.status as JobStatus)
    ? [opts.status as JobStatus]
    : [...SEARCH_STATUSES];

  const jobs: Job[] = [];
  for (const s of statuses) {
    const files = await listDir(`system/jobs/${s}`);
    for (const f of files.filter((n) => n.endsWith(".json"))) {
      const content = await getFile(`system/jobs/${s}/${f}`);
      if (content) {
        try { jobs.push(JSON.parse(content) as Job); } catch { /* skip malformed */ }
      }
    }
  }

  jobs.sort((a, b) => (b.updated_at || b.created_at).localeCompare(a.updated_at || a.created_at));
  return jobs.slice(0, limit);
}

/** List job IDs in the queued folder. Returns at most `limit` entries. */
export async function listQueuedJobs(limit = 1): Promise<string[]> {
  const files = await listDir("system/jobs/queued");
  return files
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .slice(0, limit);
}

/**
 * Move a job from one status to another.
 * Writes the updated JSON to the new path, then deletes the old path.
 */
export async function moveJob(
  job: Job,
  from: JobStatus,
  to: JobStatus,
  updates: Partial<Pick<Job, "result_summary" | "artifact_paths" | "error_message">> = {}
): Promise<Job> {
  const updated: Job = {
    ...job,
    ...updates,
    status: to,
    updated_at: new Date().toISOString(),
  };
  const newPath = jobPath(to, job.job_id);
  await putFile(newPath, JSON.stringify(updated, null, 2), `job: ${from} → ${to} ${job.job_id}`);
  // Best-effort delete from old location; if it fails the job still exists in the new location
  try {
    await deleteFile(jobPath(from, job.job_id), `job: cleanup ${from}/${job.job_id}`);
  } catch {
    // not fatal — the new status file is already written
  }
  return updated;
}
