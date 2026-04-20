export interface ParsedTarget {
  path?: string;
  branch?: string;
  pr?: number;
  commit?: string;
  diff?: string;
  raw: string;
}

export function parseTarget(target: string): ParsedTarget {
  const result: ParsedTarget = { raw: target };
  const parts = target.split(/\s+/);
  for (const part of parts) {
    const m = part.match(/^(path|branch|pr|commit|diff):(.+)$/);
    if (!m) continue;
    const [, key, val] = m;
    switch (key) {
      case "path": result.path = val; break;
      case "branch": result.branch = val; break;
      case "pr": { const n = parseInt(val, 10); if (!isNaN(n)) result.pr = n; break; }
      case "commit": result.commit = val; break;
      case "diff": result.diff = val; break;
    }
  }
  return result;
}

import { RoutineType } from "./types";
import { ROUTINE_REGISTRY } from "./routines";

export interface CreateRoutineJobInput {
  type: RoutineType;
  repo: string;
  target: string;
  focus?: string;
  depth?: string;
  spec?: string;
  language_hints?: string;
  source?: string;
  requested_by?: string;
}

export type RoutineValidationResult =
  | { ok: true; value: CreateRoutineJobInput; parsedTarget: ParsedTarget }
  | { ok: false; field: string; message: string };

const VALID_FOCUSES = ["general", "security", "performance", "readability", "architecture"];
const VALID_DEPTHS = ["light", "standard", "deep"];

export function validateCreateRoutineInput(input: unknown): RoutineValidationResult {
  if (!input || typeof input !== "object") {
    return { ok: false, field: "body", message: "JSON body required" };
  }
  const o = input as Record<string, unknown>;

  if (typeof o.type !== "string" || !(o.type in ROUTINE_REGISTRY)) {
    return { ok: false, field: "type", message: `type must be one of: ${Object.keys(ROUTINE_REGISTRY).join(", ")}` };
  }
  if (typeof o.repo !== "string" || !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(o.repo)) {
    return { ok: false, field: "repo", message: "repo must be owner/repo format" };
  }
  if (typeof o.target !== "string" || o.target.trim() === "") {
    return { ok: false, field: "target", message: "target is required" };
  }

  const parsedTarget = parseTarget(o.target);
  const hasField = parsedTarget.branch || parsedTarget.pr || parsedTarget.commit || parsedTarget.diff || parsedTarget.path;
  if (!hasField) {
    return { ok: false, field: "target", message: "target must contain at least one of: branch:, pr:, commit:, diff:, path:" };
  }

  if (o.focus !== undefined && (typeof o.focus !== "string" || !VALID_FOCUSES.includes(o.focus))) {
    return { ok: false, field: "focus", message: `focus must be one of: ${VALID_FOCUSES.join(", ")}` };
  }
  if (o.depth !== undefined && (typeof o.depth !== "string" || !VALID_DEPTHS.includes(o.depth))) {
    return { ok: false, field: "depth", message: `depth must be one of: ${VALID_DEPTHS.join(", ")}` };
  }

  const value: CreateRoutineJobInput = {
    type: o.type as RoutineType,
    repo: o.repo,
    target: o.target,
    focus: o.focus as string | undefined,
    depth: o.depth as string | undefined,
    spec: typeof o.spec === "string" ? o.spec : undefined,
    language_hints: typeof o.language_hints === "string" ? o.language_hints : undefined,
    source: typeof o.source === "string" ? o.source : undefined,
    requested_by: typeof o.requested_by === "string" ? o.requested_by : undefined,
  };

  return { ok: true, value, parsedTarget };
}
