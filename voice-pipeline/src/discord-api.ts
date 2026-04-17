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
