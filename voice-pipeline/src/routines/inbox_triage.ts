import { RoutineHandler, RoutineJob } from "../types";

export const inboxTriageHandler: RoutineHandler = {
  name: "inbox_triage",
  max_duration_ms: 60 * 1000, // 60 sec — lightweight triage
  required_env: ["ANTHROPIC_API_KEY"],
  system_prompt: `あなたは inbox_triage Routine 実行者です。

【タスク】
入力テキスト（Inbox に投入されたメモ）を読み、「次にやること候補 3 件」を返してください。

【出力規約（厳守）】
- 候補は必ず 3 件。2 件以下・4 件以上は禁止
- 各候補は 40 文字以内
- 具体的かつ実行可能な行動にすること
- 候補同士の重複禁止
- 入力の要約・感想・評価は禁止
- 前置き・後書き・補足説明は禁止
- 曖昧な入力でも、着手しやすい候補を優先

【最終応答の形式（厳守）】

最終応答として、以下の JSON 文字列のみを返してください。

成功時:
{"status":"completed","candidates":["候補1","候補2","候補3"],"source_text":"入力テキスト冒頭100文字","notes":null}

失敗時:
{"status":"failed","candidates":[],"source_text":"","notes":"失敗理由"}

JSON以外の前置き・後置き・解説を付けない。
`,

  build_prompt(job: RoutineJob): string {
    const args = job.args as {
      inbox_path?: string;
      text?: string;
    };

    const inputText = args.text || job.instruction;

    return `以下のテキストから「次にやること候補 3 件」を返してください。

## 入力テキスト

${inputText}

上記テキストを読み、system_prompt の出力規約に従って JSON を返してください。`;
  },
};

// Post-processing: extract candidates, update capture md, create artifact
export async function postProcessInboxTriage(
  job: RoutineJob,
  cliResult: { finalResult: { status?: string; candidates?: string[]; source_text?: string; notes?: string | null } | null; resultJson: Record<string, unknown> | null; rawStdout: string }
): Promise<{ candidates: string[]; artifactPaths: string[]; summary: string }> {
  const { putFile, getFile } = await import("../github-store");

  // Extract candidates from finalResult or raw output
  let candidates: string[] = [];

  if (cliResult.finalResult?.status === "completed" && Array.isArray(cliResult.finalResult.candidates)) {
    candidates = cliResult.finalResult.candidates.filter((c): c is string => typeof c === "string");
  }

  // Fallback: try to parse numbered list from raw output
  if (candidates.length === 0 && cliResult.rawStdout) {
    const lines = cliResult.rawStdout.split("\n");
    for (const line of lines) {
      const m = line.match(/^\d+\.\s+(.+)$/);
      if (m && m[1].trim()) candidates.push(m[1].trim());
    }
  }

  if (candidates.length < 3) {
    throw new Error(`inbox_triage returned ${candidates.length} candidates (expected 3)`);
  }
  candidates = candidates.slice(0, 3);

  const args = job.args as { inbox_path?: string; text?: string };
  const now = new Date();
  const isoNow = now.toISOString();

  // 1. Save artifact md
  const vaultBase = process.env.GITHUB_VAULT_PATH
    ? process.env.GITHUB_VAULT_PATH.replace(/\/+$/, "") + "/"
    : "";
  const dateStr = isoNow.slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
  const artifactPath = `${vaultBase}Inbox/${dateStr}_${timeStr}_triage_${job.job_id}.md`;

  const artifactMd = `---
type: inbox-triage-result
job_id: "${job.job_id}"
created: "${isoNow}"
source_capture: "${args.inbox_path ?? "unknown"}"
---

# Triage 結果: ${job.job_id}

## 次アクション候補

${candidates.map((c, i) => `${i + 1}. ${c}`).join("\n")}

## 元テキスト（冒頭）

${(args.text ?? job.instruction).slice(0, 200)}
`;

  await putFile(artifactPath, artifactMd, `triage: ${job.job_id}`);

  // 2. Update capture md if inbox_path is available
  if (args.inbox_path) {
    try {
      const existing = await getFile(args.inbox_path);
      if (existing) {
        let updated = existing;

        // Update frontmatter fields
        updated = updated.replace(/status:\s*"unprocessed"/, `status: "triaged"`);
        updated = updated.replace(/triaged_at:\s*null/, `triaged_at: "${isoNow}"`);
        updated = updated.replace(
          /ai_candidates:\s*null/,
          `ai_candidates: [${candidates.map(c => `"${c.replace(/"/g, '\\"')}"`).join(", ")}]`
        );

        // Replace placeholder with actual candidates
        updated = updated.replace(
          /## AI 次アクション候補\n\n（処理完了後に追記されます）/,
          `## AI 次アクション候補\n\n${candidates.map((c, i) => `${i + 1}. ${c}`).join("\n")}`
        );

        await putFile(args.inbox_path, updated, `triage: update ${job.job_id}`);
      }
    } catch (err) {
      console.warn(`[inbox_triage] Failed to update capture md: ${err instanceof Error ? err.message : err}`);
    }
  }

  const summary = `候補: ${candidates.map((c, i) => `${i + 1}. ${c}`).join(" / ")}`;
  return { candidates, artifactPaths: [artifactPath], summary };
}
