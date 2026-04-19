import { randomUUID } from "crypto";
import { putFile, getFile, deleteFile, listDir } from "./github-store";
import { RoutineJob, JobStatus } from "./types";
import { CreateRoutineJobInput, ParsedTarget } from "./routine-validators";

const SEARCH_STATUSES: JobStatus[] = [
  "queued", "running", "waiting_approval", "completed", "failed", "cancelled",
];

export function generateRoutineJobId(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear().toString();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const rand = randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  return `RJOB-${yyyy}${mm}${dd}-${rand}`;
}

function jobPath(status: string, jobId: string): string {
  return `system/routine_jobs/${status}/${jobId}.json`;
}

export async function createRoutineJob(
  input: CreateRoutineJobInput,
  parsedTarget: ParsedTarget
): Promise<{ job: RoutineJob; saved_path: string }> {
  const now = new Date().toISOString();
  const job: RoutineJob = {
    job_id: generateRoutineJobId(),
    type: input.type,
    instruction: `${input.type}: ${input.repo} ${input.target}`,
    args: {
      repo: input.repo,
      target: input.target,
      focus: input.focus ?? "general",
      depth: input.depth ?? "standard",
      language_hints: input.language_hints,
      path: parsedTarget.path,
      branch: parsedTarget.branch,
      pr: parsedTarget.pr,
      commit: parsedTarget.commit,
      diff: parsedTarget.diff,
    },
    source: input.source ?? null,
    requested_by: input.requested_by ?? null,
    metadata: {},
    status: "queued",
    created_at: now,
    updated_at: now,
    save_target: "github_contents_api",
    result_summary: null,
    artifact_paths: [],
    error_message: null,
  };

  const savedPath = jobPath("queued", job.job_id);
  await putFile(savedPath, JSON.stringify(job, null, 2), `routine: create ${job.job_id}`);
  return { job, saved_path: savedPath };
}

export async function findRoutineJob(jobId: string): Promise<RoutineJob | null> {
  let best: RoutineJob | null = null;
  let bestIdx = -1;
  for (let i = 0; i < SEARCH_STATUSES.length; i++) {
    const content = await getFile(jobPath(SEARCH_STATUSES[i], jobId));
    if (content === null) continue;
    const job = JSON.parse(content) as RoutineJob;
    if (!best) { best = job; bestIdx = i; continue; }
    if (job.updated_at > best.updated_at || (job.updated_at === best.updated_at && i > bestIdx)) {
      best = job; bestIdx = i;
    }
  }
  return best;
}

export async function retryRoutineJob(
  jobId: string
): Promise<{ ok: true; job: RoutineJob; saved_path: string } | { ok: false; reason: string }> {
  const original = await findRoutineJob(jobId);
  if (!original) return { ok: false, reason: "job が見つかりませんでした。" };
  if (original.status !== "failed" && original.status !== "waiting_approval") {
    return { ok: false, reason: `status が ${original.status} のため再試行できません。failed または waiting_approval のみ対象。` };
  }

  const now = new Date().toISOString();
  const retried: RoutineJob = {
    ...original,
    status: "queued",
    updated_at: now,
    result_summary: null,
    artifact_paths: [],
    error_message: null,
    metadata: { ...original.metadata, retried_from: original.job_id, retried_at: now },
  };

  const newPath = jobPath("queued", retried.job_id);
  await putFile(newPath, JSON.stringify(retried, null, 2), `routine: retry ${retried.job_id}`);

  try {
    await deleteFile(jobPath(original.status, original.job_id), `routine: cleanup retry source ${original.job_id}`);
  } catch { /* non-fatal */ }

  return { ok: true, job: retried, saved_path: newPath };
}
