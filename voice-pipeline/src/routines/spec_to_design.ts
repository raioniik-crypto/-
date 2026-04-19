import { RoutineHandler, RoutineJob } from "../types";

export const specToDesignHandler: RoutineHandler = {
  name: "spec_to_design",
  max_duration_ms: 45 * 60 * 1000, // 45 min
  required_env: ["ANTHROPIC_API_KEY", "GITHUB_TOKEN"],
  system_prompt: `あなたは voice-pipeline-routine-worker の spec_to_design Routine 実行者です。

【タスク】
入力された仕様（spec）を読み、実装者が即座に着手できる設計文書を生成してください。

【出力形式】
以下の構造の Markdown 設計文書を生成すること。

1. 概要（3行以内）
2. 背景・目的
3. 要件一覧（箇条書き）
4. 技術設計
   - アーキテクチャ
   - データフロー
   - 主要コンポーネント
5. 実装方針（具体的な手順）
6. スコープ（やること / やらないこと）
7. 受け入れ条件（検証可能な条件）
8. リスク・注意点
9. 未決定事項（情報不足で決められない点）

【制約】
- spec に書かれていない情報を勝手に創作しない
- 不明点は「未決定事項」セクションに明記する
- 曖昧な表現（「適宜」「いい感じに」等）を使わない
- 出力は日本語
- 設計文書は Obsidian で読めるフォーマットにする

【最終応答の形式（厳守）】

最終応答として、以下の JSON 文字列のみを返してください。

成功時:
{"status":"completed","summary":"1〜2行の要約","result_markdown":"設計文書の全文","artifacts":[{"path":"vault/03_開発/Design Specs/YYYY-MM-DD_spec-to-design_xxx.md","summary":"要約"}],"human_check_points":["確認ポイント1","確認ポイント2"]}

ブロッカー時:
{"status":"blocked","blocker_type":"B1等","reason":"理由","context":"状況","required_action":"解除方法","partial_results":[]}

失敗時:
{"status":"failed","error_type":"エラー種別","error_message":"詳細","reproduction_steps":["手順1"]}

JSON以外の前置き・後置き・解説を付けない。
`,

  build_prompt(job: RoutineJob): string {
    const args = job.args as {
      repo?: string;
      target?: string;
      spec?: string;
      focus?: string;
    };

    const spec = args.spec || job.instruction;
    const repo = args.repo ? `対象リポジトリ: ${args.repo}` : "";
    const target = args.target ? `対象ブランチ/パス: ${args.target}` : "";
    const focus = args.focus ? `重点観点: ${args.focus}` : "";

    return `以下の仕様から設計文書を生成してください。

${repo}
${target}
${focus}

## 入力仕様（spec）

${spec}

上記 spec を読み、system_prompt に記載された構造に従って設計文書を生成してください。
不明点は「未決定事項」セクションに明記してください。`;
  },
};
