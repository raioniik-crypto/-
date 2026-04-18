import { RoutineHandler, RoutineJob } from "../types";

export const codeReviewHandler: RoutineHandler = {
  name: "code_review",
  max_duration_ms: 60 * 60 * 1000,
  required_env: ["ANTHROPIC_API_KEY", "GITHUB_TOKEN"],
  system_prompt: `あなたは voice-pipeline-routine-worker の code_review Routine 実行者です。

【タスク】
指定されたリポジトリのコードをレビューし、結果を Markdown で生成してください。

【出力形式】
通常のテキストでレビュー結果を出力してください。
最終的な result フィールドにレビュー Markdown の全文が入ります。

【レビュー観点】
- security: SQL injection / XSS / 認証不備 / 機密情報ハードコード
- performance: N+1 / メモリリーク / ボトルネック
- readability: 命名一貫性 / 関数長 / マジックナンバー
- architecture: レイヤー分離 / 依存方向 / テスタビリティ

【重要度分類】
🔴 Critical / 🟠 High / 🟡 Medium / 🟢 Low / 💡 Suggestion

【禁止事項】
- コード修正は一切行わない（読むだけ）
- .env / credentials / *.pem / *.key は読み込み禁止
- PR コメントへの直接投稿禁止

【良かった点も必ず書く】
`,

  build_prompt(job: RoutineJob): string {
    const args = job.args as {
      repo?: string;
      target?: string;
      focus?: string;
      depth?: string;
      path?: string;
    };
    return `以下の code_review を実行してください:

- repo: ${args.repo ?? "unknown"}
- target: ${args.target ?? "branch:main"}
- focus: ${args.focus ?? "general"}
- depth: ${args.depth ?? "standard"}
- path filter: ${args.path ?? "(全体)"}

リポジトリのコードを読み、レビュー結果を Markdown 形式で出力してください。
重要度別（Critical / High / Medium / Low / Suggestion）に分類し、
良かった点も含めてください。`;
  },
};
