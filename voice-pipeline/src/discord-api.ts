import { Job } from "./types";

const BASE_URL = process.env.VOICE_PIPELINE_API_BASE_URL || "";
const API_KEY = process.env.INGEST_API_KEY || "";

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (API_KEY) h["Authorization"] = `Bearer ${API_KEY}`;
  return h;
}

export interface CreateJobResponse {
  result: "accepted";
  job_id: string;
  status: string;
  saved_path: string;
}

export async function createJob(opts: {
  type: string;
  instruction: string;
  source?: string;
  requested_by?: string;
}): Promise<CreateJobResponse> {
  const res = await fetch(`${BASE_URL}/jobs`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(opts),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`POST /jobs ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as CreateJobResponse;
}

export interface JobSummary {
  job_id: string;
  status: string;
  type: string;
  artifact_paths: string[];
  updated_at: string;
}

export async function listJobs(opts: { status?: string; limit?: number } = {}): Promise<JobSummary[]> {
  const params = new URLSearchParams();
  if (opts.status) params.set("status", opts.status);
  if (opts.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();
  const res = await fetch(`${BASE_URL}/jobs${qs ? "?" + qs : ""}`, {
    headers: headers(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GET /jobs ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { items: JobSummary[] };
  return data.items;
}

export interface RetryJobResponse {
  result: "retried";
  source_job_id: string;
  job_id: string;
  type: string;
  status: string;
}

export async function retryJob(jobId: string): Promise<RetryJobResponse> {
  const res = await fetch(`${BASE_URL}/jobs/${encodeURIComponent(jobId)}/retry`, {
    method: "POST",
    headers: headers(),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    throw new Error(data.message || data.error || `retry failed: ${res.status}`);
  }
  return (await res.json()) as RetryJobResponse;
}

export interface ArtifactResponse {
  job_id: string;
  type: string;
  artifact_path: string;
  content: string;
}

export async function getArtifact(jobId: string): Promise<ArtifactResponse> {
  const res = await fetch(`${BASE_URL}/jobs/${encodeURIComponent(jobId)}/artifact`, {
    headers: headers(),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    throw new Error(data.message || data.error || `artifact fetch failed: ${res.status}`);
  }
  return (await res.json()) as ArtifactResponse;
}

export async function getJob(jobId: string): Promise<Job | null> {
  const res = await fetch(`${BASE_URL}/jobs/${encodeURIComponent(jobId)}`, {
    headers: headers(),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GET /jobs/${jobId} ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as Job;
}

/** Poll until job reaches a terminal status or timeout. */
export async function pollJob(
  jobId: string,
  timeoutMs = 60_000,
  intervalMs = 5_000
): Promise<Job | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const job = await getJob(jobId);
    if (job && (job.status === "completed" || job.status === "failed" || job.status === "cancelled")) {
      return job;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return await getJob(jobId);
}
