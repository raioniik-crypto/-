import { randomUUID } from "crypto";
import { putFile, getFile } from "./github-store";
import { Job, JobStatus, JobType, CreateJobInput } from "./types";

const VALID_TYPES: JobType[] = ["memo_capture", "content_draft", "dev_brief"];

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

/** Search status folders in order; return first match or null. */
export async function findJob(jobId: string): Promise<Job | null> {
  for (const status of SEARCH_STATUSES) {
    const content = await getFile(jobPath(status, jobId));
    if (content !== null) {
      return JSON.parse(content) as Job;
    }
  }
  return null;
}
