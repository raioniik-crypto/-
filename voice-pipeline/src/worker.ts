import "dotenv/config";
import { listQueuedJobs, findJob, moveJob } from "./jobs";
import { putFile } from "./github-store";
import { Job } from "./types";

export interface WorkerResult {
  result: "processed" | "no_job" | "error";
  job_id?: string;
  status?: string;
  artifact_paths?: string[];
  error?: string;
}

/** Pick up one queued job and execute it. */
export async function runOnce(): Promise<WorkerResult> {
  // 1. Find one queued job
  const ids = await listQueuedJobs(1);
  if (ids.length === 0) {
    console.log("[worker] No queued jobs found.");
    return { result: "no_job" };
  }
  const jobId = ids[0];
  const job = await findJob(jobId);
  if (!job || job.status !== "queued") {
    console.log(`[worker] Job ${jobId} not found or not queued, skipping.`);
    return { result: "no_job" };
  }

  console.log(`[worker] Processing ${job.job_id} (type=${job.type})`);

  // 2. Move to running
  const running = await moveJob(job, "queued", "running");

  // 3. Execute
  try {
    const executor = executors[running.type];
    if (!executor) throw new Error(`Unsupported job type: ${running.type}`);
    const { artifactPaths, summary } = await executor(running);

    // 4. Move to completed
    const completed = await moveJob(running, "running", "completed", {
      result_summary: summary,
      artifact_paths: artifactPaths,
      error_message: null,
    });
    console.log(`[worker] ${completed.job_id} \u2192 completed`);
    return {
      result: "processed",
      job_id: completed.job_id,
      status: "completed",
      artifact_paths: artifactPaths,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[worker] ${running.job_id} \u2192 failed: ${msg}`);
    // 5. Move to failed
    try {
      await moveJob(running, "running", "failed", {
        result_summary: null,
        artifact_paths: [],
        error_message: msg,
      });
    } catch {
      // Best-effort; the running file still exists
    }
    return { result: "error", job_id: running.job_id, status: "failed", error: msg };
  }
}

// ============================================================
// memo_capture executor
// ============================================================

async function executeMemoCapture(
  job: Job
): Promise<{ artifactPaths: string[]; summary: string }> {
  const now = new Date();
  const isoDate = now.toISOString();
  const dateStr = isoDate.slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5).replace(":", "");

  const safeTitle = job.instruction
    .replace(/[\r\n]+/g, " ")
    .replace(/[/\\:*?"<>|]/g, "_")
    .slice(0, 60)
    .trim();
  const displayTitle = safeTitle || "memo";

  const vaultBase = process.env.GITHUB_VAULT_PATH
    ? process.env.GITHUB_VAULT_PATH.replace(/\/+$/, "") + "/"
    : "";
  const filename = `${dateStr}_${timeStr}_${displayTitle}.md`;
  const repoPath = `${vaultBase}Inbox/${filename}`;

  const nextActions = extractNextActions(job.instruction);

  const markdown = `---\ntitle: "${displayTitle}"\ncreated_at: "${isoDate}"\ntype: "memo_capture"\nsource: "${job.source ?? "api"}"\nrequested_by: "${job.requested_by ?? "unknown"}"\njob_id: "${job.job_id}"\nstatus: "completed"\n---\n\n# ${displayTitle}\n\n## \u8981\u70b9\n${job.instruction}\n\n## \u672c\u6587\n${job.instruction}\n\n## \u6b21\u30a2\u30af\u30b7\u30e7\u30f3\n${nextActions}\n`;

  await putFile(repoPath, markdown, `memo: ${displayTitle} (${job.job_id})`);

  return {
    artifactPaths: [repoPath],
    summary: `Saved memo to ${repoPath}`,
  };
}

function extractNextActions(text: string): string {
  const lines = text.split(/[\r\n]+/).filter((l) => /^[-\u30fb\u25cf]/.test(l.trim()));
  if (lines.length > 0) return lines.join("\n");
  return "\u306a\u3057";
}

function generateHashtags(text: string): string {
  const keywords = text
    .replace(/[\r\n]+/g, " ")
    .split(/[\s、。,．・]+/)
    .filter((w) => w.length >= 2 && w.length <= 20)
    .slice(0, 5);
  if (keywords.length === 0) return "#メモ #進捗";
  return keywords.map((w) => `#${w}`).join(" ");
}

// ============================================================
// Shared file path builder
// ============================================================

function buildFilePath(job: Job, type: string, folder = "Inbox"): { repoPath: string; safeTitle: string; isoDate: string } {
  const now = new Date();
  const isoDate = now.toISOString();
  const dateStr = isoDate.slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5).replace(":", "");
  const safeTitle = job.instruction
    .replace(/[\r\n]+/g, " ")
    .replace(/[/\\:*?"<>|]/g, "_")
    .slice(0, 50)
    .trim() || type;
  const vaultBase = process.env.GITHUB_VAULT_PATH
    ? process.env.GITHUB_VAULT_PATH.replace(/\/+$/, "") + "/"
    : "";
  const filename = `${dateStr}_${timeStr}_${type}_${safeTitle}.md`;
  const repoPath = `${vaultBase}${folder}/${filename}`;
  return { repoPath, safeTitle, isoDate };
}

// ============================================================
// dev_brief executor
// ============================================================

async function executeDevBrief(
  job: Job
): Promise<{ artifactPaths: string[]; summary: string }> {
  const { repoPath, safeTitle, isoDate } = buildFilePath(job, "dev_brief", "03_開発/Dev Briefs");
  const inst = job.instruction;

  const meta = job.metadata && Object.keys(job.metadata).length > 0 ? JSON.stringify(job.metadata) : "なし";
  const by = job.requested_by ?? "未指定";

  const markdown = `---
title: "${safeTitle}"
created_at: "${isoDate}"
type: "dev_brief"
source: "${job.source ?? "api"}"
requested_by: "${by}"
job_id: "${job.job_id}"
status: "completed"
generation_mode: "template"
---

# 開発ブリーフ: ${safeTitle}

## 概要
${inst}

## 背景
この依頼の背景や動機を以下に整理する。
- 依頼元: ${by}
- 補足情報: ${meta}
- 不明点があれば着手前に依頼者へ確認すること

## 目的
${inst} を実現する。既存の動作を維持しつつ、必要最小限の変更で対応する。

## やること
- [ ] 要件を整理し、不明点を洗い出す
- [ ] ${inst} の実装方針を決める
- [ ] 影響範囲を特定する
- [ ] 実装する
- [ ] ローカルで動作確認する
- [ ] レビュー・本番反映する

## スコープ
- ${inst} に直接関わる変更のみ
- 依頼内容に明示されていない周辺改修は含めない

## 非スコープ
- 依頼内容に含まれない既存機能の大規模リファクタ
- 今回の依頼と無関係な UI/UX 変更
- 不明点は着手前に確認し、勝手にスコープを広げない

## 入力
- 依頼内容: ${inst}
- 依頼元: ${by}
- 補足: ${meta}

## 出力
- 本ブリーフに基づく実装成果物
- 動作確認結果のレポートまたはスクリーンショット

## 制約
- 既存機能を壊さないこと
- 最小変更で対応すること
- 詳細要件が未確定の場合は、既存仕様との整合確認を優先すること
- パフォーマンスやセキュリティに影響する変更は事前共有すること

## 実装方針
- まず既存コードの該当箇所を確認する
- 変更範囲を最小限に絞る
- 不要な抽象化や先回り実装は行わない
- 既存のコーディング規約・命名規則に従う

## 作業手順
1. 本ブリーフの内容を確認し、不明点があれば依頼者に質問する
2. 影響範囲を調査し、変更対象ファイルを特定する
3. 実装する
4. ローカルで動作確認する
5. コードレビューを依頼する
6. 本番環境に反映する
7. 本番で動作確認する

## 受け入れ条件
- [ ] ${inst} が正しく動作すること
- [ ] 既存機能が壊れていないこと
- [ ] エラーハンドリングが適切であること
- [ ] 本番反映後の動作確認が完了していること

## 確認手順
- [ ] 変更対象のファイルが最小限であること
- [ ] ローカルで正常系・異常系を確認したこと
- [ ] 既存のテストや動作が壊れていないこと
- [ ] 依頼内容が正しく反映されていること
- [ ] 本番反映後に実際の動作を確認したこと

## リスク / 注意点
- 依頼内容の詳細が不足している場合、実装者の解釈で進めるリスクがある → 着手前に確認
- 影響範囲が想定より広い場合がある → 調査結果を早めに共有
- 本番反映後に問題が発覚した場合の切り戻し手順を事前に確認しておくこと

## メモ
- 着手前に依頼者へ不明点を確認すること
- 想定外の影響があれば早めに共有すること
- 完了後は本ブリーフの受け入れ条件を再確認すること
`;

  await putFile(repoPath, markdown, `dev_brief: ${safeTitle} (${job.job_id})`);
  return { artifactPaths: [repoPath], summary: `Saved dev_brief to ${repoPath}` };
}

// ============================================================
// content_draft executor
// ============================================================

async function executeContentDraft(
  job: Job
): Promise<{ artifactPaths: string[]; summary: string }> {
  const { repoPath, safeTitle, isoDate } = buildFilePath(job, "content_draft", "02_ライティング/Content Drafts");
  const inst = job.instruction;

  const short = inst.length > 60 ? inst.slice(0, 57) + "..." : inst;

  const markdown = `---
title: "${safeTitle}"
created_at: "${isoDate}"
type: "content_draft"
source: "${job.source ?? "api"}"
requested_by: "${job.requested_by ?? "unknown"}"
job_id: "${job.job_id}"
status: "completed"
generation_mode: "template"
---

# コンテンツ下書き: ${safeTitle}

## 方向性メモ
- 主題: ${inst}
- 想定読者: ${inst} に関心がある層
- トーン: 実感ベース、押し付けない、自分の言葉で

## 投稿案1（共感・丁寧）
${inst}。

正直まだ手探りだけど、やってみて分かることがある。
完成してから出すんじゃなくて、途中の今を残しておく。

## 投稿案2（実用・学び）
${inst} について整理してみた。

やってみて気づいたのは、最初の一歩が一番重い、ということ。
でも動き出すと意外と転がる。誰かの参考になれば。

## 投稿案3（宣言・勢い）
${inst}——やると決めた以上、形にする。

完璧じゃなくていい。まず出す。直すのはそのあと。

## 短文版
${short}

## CTA案
- 同じこと考えてる人いたら教えてください
- 感想・質問あれば気軽にどうぞ
- 続きが気になったらフォローしておいてください

## ハッシュタグ案
${generateHashtags(inst)}

## 使い分けメモ
- 案1: ブログ・note向き。丁寧に伝えたいとき
- 案2: X・はてブ向き。学びを共有したいとき
- 案3: X・ストーリーズ向き。勢いで投稿したいとき
- 短文版: リポスト・引用向き
- トーン調整や追加の切り口が必要な場合は再依頼してください
`;

  await putFile(repoPath, markdown, `content_draft: ${safeTitle} (${job.job_id})`);
  return { artifactPaths: [repoPath], summary: `Saved content_draft to ${repoPath}` };
}

// saveSimpleMarkdown is kept as fallback for future executor types
async function saveSimpleMarkdown(
  job: Job,
  type: string
): Promise<{ artifactPaths: string[]; summary: string }> {
  const now = new Date();
  const isoDate = now.toISOString();
  const dateStr = isoDate.slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5).replace(":", "");

  const safeTitle = job.instruction
    .replace(/[\r\n]+/g, " ")
    .replace(/[/\\:*?"<>|]/g, "_")
    .slice(0, 50)
    .trim() || type;

  const vaultBase = process.env.GITHUB_VAULT_PATH
    ? process.env.GITHUB_VAULT_PATH.replace(/\/+$/, "") + "/"
    : "";
  const filename = `${dateStr}_${timeStr}_${type}_${safeTitle}.md`;
  const repoPath = `${vaultBase}Inbox/${filename}`;

  const markdown = `---
title: "${safeTitle}"
created_at: "${isoDate}"
type: "${type}"
source: "${job.source ?? "api"}"
requested_by: "${job.requested_by ?? "unknown"}"
job_id: "${job.job_id}"
status: "completed"
---

# ${safeTitle}

## 指示内容
${job.instruction}

## 本文
${job.instruction}
`;

  await putFile(repoPath, markdown, `${type}: ${safeTitle} (${job.job_id})`);

  return {
    artifactPaths: [repoPath],
    summary: `Saved ${type} to ${repoPath}`,
  };
}

// ============================================================
// x_post executor
// ============================================================

async function executeXPost(
  job: Job
): Promise<{ artifactPaths: string[]; summary: string }> {
  const { repoPath, safeTitle, isoDate } = buildFilePath(job, "x_post", "02_ライティング/X Posts");
  const inst = job.instruction;
  const short = inst.length > 50 ? inst.slice(0, 47) + "..." : inst;

  const markdown = `---
title: "${safeTitle}"
created_at: "${isoDate}"
type: "x_post"
source: "${job.source ?? "api"}"
requested_by: "${job.requested_by ?? "unknown"}"
job_id: "${job.job_id}"
status: "completed"
generation_mode: "template"
---

# X投稿下書き: ${safeTitle}

## 投稿案1（共感型）
${short}

やってみて初めて分かることがある。完璧じゃなくても、動いた人にしか見えない景色がある。

## 投稿案2（学び型）
${inst} を試してみた。

結論: まずやる。考えすぎるより手を動かした方が早い。

## 投稿案3（宣言型）
${inst}。やる。

## 一言フック案
- 「${short}」← これ、やってみたら意外と回った
- 地味だけど効いた話: ${short}
- 今日やったこと → ${short}

## ハッシュタグ案
${generateHashtags(inst)}

## メモ
- X向け: 140字を意識、簡潔さ優先
- 案1は共感を引く、案2は知見共有、案3は短く宣言
- フック案はそのままツイート冒頭に使える想定
`;

  await putFile(repoPath, markdown, `x_post: ${safeTitle} (${job.job_id})`);
  return { artifactPaths: [repoPath], summary: `Saved x_post to ${repoPath}` };
}

// ============================================================
// instagram_caption executor
// ============================================================

async function executeInstagramCaption(
  job: Job
): Promise<{ artifactPaths: string[]; summary: string }> {
  const { repoPath, safeTitle, isoDate } = buildFilePath(job, "instagram_caption", "02_ライティング/Instagram Captions");
  const inst = job.instruction;

  // Extract scene keywords from instruction instead of using raw text
  const scene = extractScene(inst);
  const tags = generateInstaTags(inst);

  const markdown = `---
title: "${safeTitle}"
created_at: "${isoDate}"
type: "instagram_caption"
source: "${job.source ?? "api"}"
requested_by: "${job.requested_by ?? "unknown"}"
job_id: "${job.job_id}"
status: "completed"
generation_mode: "template"
---

# Instagramキャプション下書き: ${safeTitle}

## キャプション案1（やわらかめ）
${scene.setting}、
${scene.action}。

大きく進んだわけじゃなくても、
少しずつ形になっていく時間が好きです。

今日も、ちゃんと一歩。

## キャプション案2（芯あり）
${scene.setting}に手を動かした分だけ、
前に進める気がする。

派手じゃなくても、
積み重ねた時間はちゃんと力になる。

${scene.action}、継続中です。

## 短め版
${scene.setting}と、${scene.action}。
今日も少しずつ前へ。

## ハッシュタグ案
${tags}

## 投稿トーンメモ
- 案1: 穏やか・日常記録向き
- 案2: 継続・意志を込めたいとき向き
- 画像が決まったらキャプションを微調整してください
`;

  await putFile(repoPath, markdown, `instagram_caption: ${safeTitle} (${job.job_id})`);
  return { artifactPaths: [repoPath], summary: `Saved instagram_caption to ${repoPath}` };
}

/** Extract scene elements from instruction for natural caption generation. */
function extractScene(inst: string): { setting: string; action: string } {
  // Strip trailing intent expressions like ～したい / ～してほしい / ～にしたい
  const cleaned = inst
    .replace(/[。、．，]+$/g, "")
    .replace(/[をにが]?[、。]?(?:投稿文に|キャプションに|文章に)?(?:したい|してほしい|してください|する|して)$/g, "")
    .replace(/[、。]?(?:やわらかく|丁寧に|短く|自然に)$/g, "")
    .trim();

  // Try to split on particles to find setting vs action
  const parts = cleaned.split(/[、。をにで]/g).filter((s) => s.trim().length > 0);
  if (parts.length >= 2) {
    return { setting: parts[0].trim(), action: parts.slice(1).join("、").trim() };
  }
  // Fallback: use cleaned text for both
  return { setting: cleaned, action: "静かに手を動かした時間" };
}

/** Generate Instagram-appropriate hashtags from instruction keywords. */
function generateInstaTags(inst: string): string {
  const cleaned = inst
    .replace(/[をにがはのでと、。？！…\r\n]+/g, " ")
    .replace(/(?:したい|してほしい|してください|する|して|やわらかく|丁寧に)$/g, "");
  const words = cleaned.split(/\s+/).filter((w) => w.length >= 2 && w.length <= 10);
  const unique = [...new Set(words)].slice(0, 3);
  const base = unique.map((w) => `#${w}`).join(" ");
  return `${base} #日々の記録 #作業ログ #ものづくり #今日の一歩 #つくる暮らし`.trim();
}

// ============================================================
// Executor registry
// ============================================================

type JobExecutor = (job: Job) => Promise<{ artifactPaths: string[]; summary: string }>;

const executors: Record<string, JobExecutor> = {
  memo_capture: executeMemoCapture,
  dev_brief: executeDevBrief,
  content_draft: executeContentDraft,
  x_post: executeXPost,
  instagram_caption: executeInstagramCaption,
};

// ============================================================
// Loop mode
// ============================================================

const POLL_MS = parseInt(process.env.WORKER_POLL_INTERVAL_MS || "60000", 10);
const LOG_NO_JOB = process.env.WORKER_LOG_NO_JOB === "true";

let stopping = false;
let busy = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runLoop(): Promise<void> {
  console.log(`[worker:loop] Started \u2014 polling every ${POLL_MS}ms`);

  while (!stopping) {
    busy = true;
    try {
      const r = await runOnce();
      if (r.result === "processed") {
        console.log(`[worker:loop] Processed ${r.job_id} \u2192 ${r.status}`);
      } else if (r.result === "error") {
        console.error(`[worker:loop] Error on ${r.job_id}: ${r.error}`);
      } else if (LOG_NO_JOB) {
        console.log("[worker:loop] No queued jobs.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[worker:loop] Unexpected error: ${msg}`);
    }
    busy = false;

    if (stopping) break;

    // Interruptible sleep: check stopping every second
    const rounds = Math.ceil(POLL_MS / 1000);
    for (let i = 0; i < rounds && !stopping; i++) {
      await sleep(Math.min(1000, POLL_MS));
    }
  }

  console.log("[worker:loop] Stopped.");
}

// ============================================================
// Graceful shutdown
// ============================================================

function handleSignal(signal: string) {
  if (stopping) return; // already stopping
  console.log(`[worker] Received ${signal}, shutting down${busy ? " after current job..." : "..."}`);
  stopping = true;
}

process.on("SIGINT", () => handleSignal("SIGINT"));
process.on("SIGTERM", () => handleSignal("SIGTERM"));

// ============================================================
// CLI entry point
// ============================================================

const isCli =
  process.argv[1] &&
  (process.argv[1].endsWith("worker.ts") || process.argv[1].endsWith("worker"));

if (isCli) {
  const isLoop = process.argv.includes("--loop");

  if (isLoop) {
    runLoop().catch((err) => {
      console.error("[worker:loop] Fatal:", err);
      process.exit(1);
    });
  } else {
    runOnce()
      .then((r) => {
        console.log(JSON.stringify(r, null, 2));
        process.exit(r.result === "error" ? 1 : 0);
      })
      .catch((err) => {
        console.error("[worker] Fatal:", err);
        process.exit(1);
      });
  }
}
