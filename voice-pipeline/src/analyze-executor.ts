export type ExecutorErrorKind = "auth" | "server" | "timeout" | "network";

export class ExecutorError extends Error {
  constructor(public readonly kind: ExecutorErrorKind, public readonly detail: string) {
    super(`${kind}: ${detail}`);
    this.name = "ExecutorError";
  }
}

export interface QualityCheck {
  structure?: number;
  causality?: number;
  revision?: number;
  tradeoff?: number;
  genealogy?: number;
  agency?: number;
  view_update?: number;
  total?: number;
  needs_revision?: boolean;
  weak_points?: string[];
}

export interface ExecuteResponse {
  status: "ok" | "error";
  template_type: string;
  title: string;
  vault_path: string | null;
  content_preview: string | null;
  quality_check: QualityCheck | null;
  message: string | null;
}

export interface ExecuteRequest {
  source_text: string;
  template_type: string;
  title: string;
  metadata: Record<string, unknown>;
}

const TIMEOUT_MS = 120_000;

export async function callExecute(payload: ExecuteRequest): Promise<ExecuteResponse> {
  const baseUrl = process.env.STRUCTURE_NOTE_EXECUTOR_URL?.replace(/\/$/, "") ?? "";
  const apiKey = process.env.STRUCTURE_NOTE_EXECUTOR_API_KEY ?? "";

  if (!baseUrl) {
    throw new ExecutorError("network", "STRUCTURE_NOTE_EXECUTOR_URL is not set");
  }
  if (!apiKey) {
    throw new ExecutorError("auth", "STRUCTURE_NOTE_EXECUTOR_API_KEY is not set");
  }

  const url = `${baseUrl}/execute`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ExecutorError("timeout", `request timed out after ${TIMEOUT_MS}ms`);
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new ExecutorError("network", msg);
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await response.text();

  if (response.status === 401) {
    throw new ExecutorError("auth", text.slice(0, 500));
  }
  if (response.status >= 500) {
    throw new ExecutorError("server", text.slice(0, 500));
  }
  if (response.status >= 400) {
    throw new ExecutorError("server", `HTTP ${response.status}: ${text.slice(0, 500)}`);
  }

  try {
    return JSON.parse(text) as ExecuteResponse;
  } catch {
    throw new ExecutorError("server", `invalid JSON response: ${text.slice(0, 500)}`);
  }
}

export async function downloadAttachmentText(attachmentUrl: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(attachmentUrl, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`attachment download failed: HTTP ${res.status}`);
    }
    const buf = await res.arrayBuffer();
    const decoder = new TextDecoder("utf-8", { fatal: true });
    return decoder.decode(buf);
  } finally {
    clearTimeout(timeoutId);
  }
}