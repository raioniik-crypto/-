import { spawn } from "child_process";
import { RoutineFinalResult } from "./types";

export interface ClaudeCodeRunOptions {
  cwd: string;
  systemPrompt: string;
  userPrompt: string;
  maxDurationMs: number;
  jobId: string;
}

export interface ClaudeCodeRunResult {
  exitCode: number | null;
  resultJson: Record<string, unknown> | null;
  finalResult: RoutineFinalResult | null;
  rawStdout: string;
  rawStderr: string;
  timedOut: boolean;
}

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
}

export async function runClaudeCode(opts: ClaudeCodeRunOptions): Promise<ClaudeCodeRunResult> {
  const { cwd, systemPrompt, userPrompt, maxDurationMs, jobId } = opts;

  return new Promise((resolve) => {
    const args = [
      "-p", userPrompt,
      "--output-format", "json",
      "--system-prompt", systemPrompt,
      "--dangerously-skip-permissions",
      "--no-session-persistence",
    ];

    const proc = spawn("claude", args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let killed = false;

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGTERM");
      setTimeout(() => {
        if (!killed) proc.kill("SIGKILL");
      }, 5000);
    }, maxDurationMs);

    proc.on("close", (code) => {
      killed = true;
      clearTimeout(timer);

      const cleanStdout = stripAnsi(stdout);
      let resultJson: Record<string, unknown> | null = null;
      try {
        resultJson = JSON.parse(cleanStdout);
      } catch {
        // stdout wasn't valid JSON — that's OK, we handle it downstream
      }

      // Parse inner JSON from result field (選択肢 C 規約)
      let finalResult: RoutineFinalResult | null = null;
      if (resultJson && typeof resultJson.result === "string") {
        try {
          const inner = JSON.parse(resultJson.result as string) as Record<string, unknown>;
          if (
            inner &&
            typeof inner.status === "string" &&
            (inner.status === "completed" || inner.status === "blocked" || inner.status === "failed")
          ) {
            finalResult = inner as RoutineFinalResult;
          }
        } catch {
          // inner JSON parse failure → finalResult stays null, fallback path
        }
      }

      resolve({
        exitCode: code,
        resultJson,
        finalResult,
        rawStdout: cleanStdout,
        rawStderr: stripAnsi(stderr),
        timedOut,
      });
    });

    proc.on("error", (err) => {
      killed = true;
      clearTimeout(timer);
      resolve({
        exitCode: null,
        resultJson: null,
        finalResult: null,
        rawStdout: "",
        rawStderr: err.message,
        timedOut: false,
      });
    });
  });
}
