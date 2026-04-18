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

【最終応答の形式（厳守）】

最終応答として、以下の JSON 文字列のみを返してください。他の前後のテキストは一切禁止です。

成功時:
{"status":"completed","summary":"1〜2行の要約","result_markdown":"Vault保存用Markdownの全文","artifacts":[{"path":"vault/03_開発/Code Reviews/YYYY-MM-DD_code-review_xxx.md","summary":"要約"}],"human_check_points":["朝に確認すべきポイント1","朝に確認すべきポイント2"]}

ブロッカー時（リポジトリアクセス不能、対象範囲が大きすぎる等）:
{"status":"blocked","blocker_type":"CR-B1等","reason":"理由","context":"状況","required_action":"解除方法","partial_results":[]}

失敗時:
{"status":"failed","error_type":"エラー種別","error_message":"詳細","reproduction_steps":["手順1"]}

上記3形式のいずれかのJSONのみを最終応答とすること。Markdownコードブロックで囲まない。JSON以外の前置き・後置き・解説を付けない。
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
