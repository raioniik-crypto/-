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
