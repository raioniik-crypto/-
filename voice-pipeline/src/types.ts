export type JobType = "memo_capture" | "content_draft" | "dev_brief" | "x_post" | "instagram_caption";

export type JobStatus =
  | "queued"
  | "running"
  | "waiting_approval"
  | "completed"
  | "failed"
  | "cancelled";

export interface Job {
  job_id: string;
  type: JobType;
  instruction: string;
  source: string | null;
  requested_by: string | null;
  metadata: Record<string, unknown>;
  status: JobStatus;
  created_at: string;
  updated_at: string;
  save_target: "github_contents_api";
  result_summary: string | null;
  artifact_paths: string[];
  error_message: string | null;
}

export interface CreateJobInput {
  type: JobType;
  instruction: string;
  source?: string;
  requested_by?: string;
  metadata?: Record<string, unknown>;
}
