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

// ============================================================
// v3 Routine system (Phase 1 Task 4)
// ============================================================

export type RoutineType = "code_review";

export interface RoutineJob {
  job_id: string;
  type: RoutineType;
  instruction: string;
  args: Record<string, unknown>;
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

export interface RoutineHandler {
  name: RoutineType;
  max_duration_ms: number;
  required_env: string[];
  system_prompt: string;
  build_prompt(job: RoutineJob): string;
}

// ============================================================
// Routine result parsing (Task 4 hotfix: blocked 対応)
// ============================================================

export type RoutineFinalStatus = "completed" | "blocked" | "failed";

export interface RoutineFinalResult {
  status: RoutineFinalStatus;
  summary?: string;
  result_markdown?: string;
  artifacts?: Array<{ path: string; summary: string }>;
  human_check_points?: string[];
  blocker_type?: string;
  reason?: string;
  context?: string;
  required_action?: string;
  partial_results?: string[];
  error_type?: string;
  error_message?: string;
  reproduction_steps?: string[];
  [key: string]: unknown;
}
