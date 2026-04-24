import { randomBytes } from "node:crypto";

export interface AnalyzeRequest {
  userId: string;
  templateType: "structure_note" | "report_draft" | "json";
  attachmentUrl: string | null;
  filename: string | null;
  size: number | null;
  createdAt: number;
}

const TTL_MS = 10 * 60 * 1000;
const GC_INTERVAL_MS = 5 * 60 * 1000;

const store = new Map<string, AnalyzeRequest>();
let gcTimer: NodeJS.Timeout | null = null;

export function createRequestId(): string {
  return randomBytes(16).toString("base64url");
}

export function put(requestId: string, payload: AnalyzeRequest): void {
  store.set(requestId, payload);
}

export function get(requestId: string): AnalyzeRequest | undefined {
  return store.get(requestId);
}

export function del(requestId: string): void {
  store.delete(requestId);
}

export function isExpired(payload: AnalyzeRequest, now: number = Date.now()): boolean {
  return now - payload.createdAt > TTL_MS;
}

export function ensureGcStarted(): void {
  if (gcTimer !== null) return;
  gcTimer = setInterval(() => {
    try {
      const now = Date.now();
      for (const [rid, payload] of store.entries()) {
        if (isExpired(payload, now)) {
          store.delete(rid);
        }
      }
    } catch {
      // GC 失敗で Bot 停止させない
    }
  }, GC_INTERVAL_MS);
  gcTimer.unref?.();
}