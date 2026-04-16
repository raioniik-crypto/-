import "dotenv/config";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import { randomUUID, createHash } from "crypto";

// ============================================================
// Config
// ============================================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OBSIDIAN_VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH;
const NOTIFY_WEBHOOK_URL = process.env.NOTIFY_WEBHOOK_URL;
const NOTIFY_PROVIDER = process.env.NOTIFY_PROVIDER || "slack";
const TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1";
const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

const LOGS_DIR = path.join(__dirname, "..", "logs");
const PROCESSED_FILE = path.join(LOGS_DIR, "processed.json");
const RUN_LOGS_FILE = path.join(LOGS_DIR, "run-logs.ndjson");

// ============================================================
// Types
// ============================================================

type ContentType = "task" | "project" | "log" | "daily_note" | "inbox";

interface ClaudeResult {
  title: string;
  type: ContentType;
  summary: string;
  formatted_body: string;
  next_actions: string[];
  confidence: number;
  reason: string;
}

interface RunLog {
  process_id: string;
  input_file: string;
  started_at: string;
  finished_at: string;
  transcription_status: "success" | "failed" | "skipped";
  orchestration_status: "success" | "failed" | "skipped";
  save_status: "success" | "failed";
  notify_status: "success" | "failed" | "skipped";
  error?: string;
}

// ============================================================
// Console logging
// ============================================================

function clog(processId: string, step: string, message: string): void {
  console.log(
    `[${new Date().toISOString()}] [${processId}] [${step}] ${message}`
  );
}

// ============================================================
// NDJSON run log
// ============================================================

function appendRunLog(entry: RunLog): void {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  fs.appendFileSync(RUN_LOGS_FILE, JSON.stringify(entry) + "\n", "utf-8");
}

// ============================================================
// Fingerprint & dedup
// ============================================================

function getFingerprint(audioPath: string): string {
  const abs = path.resolve(audioPath);
  const stat = fs.statSync(abs);
  const raw = `${abs}|${stat.size}|${stat.mtimeMs}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

function loadProcessed(): Record<string, { process_id: string; processed_at: string }> {
  if (!fs.existsSync(PROCESSED_FILE)) return {};
  return JSON.parse(fs.readFileSync(PROCESSED_FILE, "utf-8"));
}

function markProcessed(fingerprint: string, processId: string): void {
  const data = loadProcessed();
  data[fingerprint] = { process_id: processId, processed_at: new Date().toISOString() };
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  fs.writeFileSync(PROCESSED_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// ============================================================
// Step 1: Transcribe (OpenAI Whisper)
// ============================================================

async function transcribe(
  openai: OpenAI,
  audioPath: string
): Promise<string> {
  const file = fs.createReadStream(audioPath);
  const response = await openai.audio.transcriptions.create({
    model: TRANSCRIBE_MODEL,
    file,
    language: "ja",
  });
  return response.text;
}

// ============================================================
// Step 2: Claude orchestration
// ============================================================

const CLAUDE_SYSTEM_PROMPT = `あなたは音声メモの統括整形アシスタントです。生の文字起こしテキストを受け取り、以下を行ってください。

処理内容：
1. 口語ノイズ（えー、あのー、まあ等）を除去
2. 言い直し・繰り返しを整理し、意味を明確にする
3. 文を適切に区切り、読みやすく構造化する
4. 仮タイトルを生成（短く具体的に）
5. 要点を2-3文で抽出
6. 次アクションを抽出（なければ空配列）
7. 種別を以下の優先順で分類：
   1. 明確な作業指示・TODOがある → "task"
   2. 継続案件・企画の話が中心 → "project"
   3. 実施記録・振り返り → "log"
   4. 当日雑記・日報的内容 → "daily_note"
   5. 迷うもの → "inbox"
8. 分類の確信度を0.0〜1.0で示す
9. 分類理由を1文で述べる

回答はJSON本文のみを返してください。
絶対に \`\`\`json や \`\`\` などのコードフェンスを付けないでください。
説明文、前置き、後書きも一切不要です。{ で始まり } で終わる純粋なJSONだけを返してください。

形式：
{"title":"仮タイトル","type":"task|project|log|daily_note|inbox","summary":"要点を2-3文で","formatted_body":"整形された本文","next_actions":["アクション1","アクション2"],"confidence":0.85,"reason":"分類理由を1文で"}`;

async function orchestrate(
  anthropic: Anthropic,
  transcript: string
): Promise<ClaudeResult> {
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: CLAUDE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: transcript }],
  });

  const block = response.content[0];
  if (block.type !== "text") {
    throw new Error("Claude returned non-text response");
  }

  // Strip markdown code fences if Claude wraps the JSON
  const cleaned = block.text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  const parsed = JSON.parse(cleaned);
  const validTypes: ContentType[] = ["task", "project", "log", "daily_note", "inbox"];
  if (!validTypes.includes(parsed.type)) {
    parsed.type = "inbox";
  }
  if (!Array.isArray(parsed.next_actions)) {
    parsed.next_actions = [];
  }

  return parsed as ClaudeResult;
}

// ============================================================
// Step 3: Save to Obsidian
// ============================================================

const FOLDER_MAP: Record<string, string> = {
  task: "Tasks",
  project: "Projects",
  log: "Logs",
  daily_note: "Daily Notes",
  inbox: "Inbox",
};

interface SaveData {
  processId: string;
  audioFilename: string;
  rawTranscript: string;
  status: "captured" | "transcript_only";
  title: string;
  type: string;
  summary: string;
  formattedBody: string;
  nextActions: string;
  reason: string;
}

function saveToObsidian(data: SaveData): string {
  const now = new Date();
  const isoDate = now.toISOString();
  const dateStr = isoDate.slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5).replace(":", "");

  const folder = FOLDER_MAP[data.type] || "Inbox";
  const targetDir = path.join(OBSIDIAN_VAULT_PATH!, folder);
  fs.mkdirSync(targetDir, { recursive: true });

  const safeTitle = data.title
    .replace(/[/\\:*?"<>|]/g, "_")
    .slice(0, 80);
  const filename = `${dateStr}_${timeStr}_${safeTitle}.md`;
  const filePath = path.join(targetDir, filename);

  const markdown = `---
title: "${data.title}"
created_at: "${isoDate}"
type: "${data.type}"
source: "voice"
audio_file: "${data.audioFilename}"
process_id: "${data.processId}"
status: "${data.status}"
model_used_transcription: "${TRANSCRIBE_MODEL}"
model_used_orchestration: "${data.status === "captured" ? CLAUDE_MODEL : "none"}"
---

# ${data.title}

## 要点
${data.summary}

## 本文
${data.formattedBody}

## 次アクション
${data.nextActions}

## 生文字起こし
${data.rawTranscript}

## 分類理由
${data.reason}
`;

  fs.writeFileSync(filePath, markdown, "utf-8");
  return filePath;
}

// ============================================================
// Step 4: Notify
// ============================================================

async function notifySuccess(
  processId: string,
  title: string,
  type: string,
  savedPath: string
): Promise<boolean> {
  return sendWebhook(
    `音声メモ保存完了\n${fmt("タイトル", title)}\n種別: ${type}\n保存先: ${path.basename(savedPath)}\nID: ${processId}`
  );
}

async function notifyFailure(
  processId: string,
  failedStep: string,
  errorMsg: string
): Promise<boolean> {
  return sendWebhook(
    `音声メモ処理失敗\n失敗段階: ${failedStep}\nエラー: ${errorMsg}\nID: ${processId}`
  );
}

function fmt(label: string, value: string): string {
  if (NOTIFY_PROVIDER === "discord") return `**${label}:** ${value}`;
  return `*${label}:* ${value}`;
}

async function sendWebhook(message: string): Promise<boolean> {
  if (!NOTIFY_WEBHOOK_URL) return false;
  const body =
    NOTIFY_PROVIDER === "discord"
      ? { content: message }
      : { text: message };
  try {
    const res = await fetch(NOTIFY_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ============================================================
// Main
// ============================================================

async function main(): Promise<void> {
  const audioPath = process.argv[2];

  if (!audioPath) {
    console.error('Usage: npm run dev -- "<audio-file-path>"');
    console.error('       npx tsx src/pipeline.ts "<audio-file-path>"');
    process.exit(1);
  }
  if (!OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY is not set");
    process.exit(1);
  }
  if (!ANTHROPIC_API_KEY) {
    console.error("Error: ANTHROPIC_API_KEY is not set");
    process.exit(1);
  }
  if (!OBSIDIAN_VAULT_PATH) {
    console.error("Error: OBSIDIAN_VAULT_PATH is not set");
    process.exit(1);
  }
  if (!fs.existsSync(audioPath)) {
    console.error(`Error: Audio file not found: ${audioPath}`);
    process.exit(1);
  }

  const processId = randomUUID().slice(0, 8);
  const audioFilename = path.basename(audioPath);
  const startedAt = new Date().toISOString();

  const runLog: RunLog = {
    process_id: processId,
    input_file: audioFilename,
    started_at: startedAt,
    finished_at: "",
    transcription_status: "skipped",
    orchestration_status: "skipped",
    save_status: "failed",
    notify_status: "skipped",
  };

  clog(processId, "START", `Processing ${audioFilename}`);

  // Dedup check
  const fingerprint = getFingerprint(audioPath);
  const processed = loadProcessed();
  if (processed[fingerprint]) {
    clog(
      processId,
      "SKIP",
      `Already processed (prev ID: ${processed[fingerprint].process_id})`
    );
    console.log("Duplicate file — skipping.");
    process.exit(0);
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  // Step 1: Transcribe
  let rawTranscript: string;
  try {
    clog(processId, "TRANSCRIBE", "Starting...");
    rawTranscript = await transcribe(openai, audioPath);
    runLog.transcription_status = "success";
    clog(processId, "TRANSCRIBE", `Done (${rawTranscript.length} chars)`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    runLog.transcription_status = "failed";
    runLog.error = `TRANSCRIBE: ${msg}`;
    runLog.finished_at = new Date().toISOString();
    appendRunLog(runLog);
    clog(processId, "ERROR", `Transcription failed: ${msg}`);
    if (NOTIFY_WEBHOOK_URL) await notifyFailure(processId, "TRANSCRIBE", msg);
    process.exit(1);
  }

  // Step 2: Claude orchestration
  let claude: ClaudeResult | null = null;
  try {
    clog(processId, "ORCHESTRATE", "Starting...");
    claude = await orchestrate(anthropic, rawTranscript);
    runLog.orchestration_status = "success";
    clog(
      processId,
      "ORCHESTRATE",
      `Done — type=${claude.type}, title="${claude.title}", confidence=${claude.confidence}`
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    runLog.orchestration_status = "failed";
    clog(processId, "ORCHESTRATE", `Failed: ${msg} — falling back to rescue save`);
  }

  // Step 3: Save to Obsidian
  let savedPath: string;
  try {
    clog(processId, "SAVE", "Saving...");
    if (claude) {
      const nextActionsStr = claude.next_actions.length > 0
        ? claude.next_actions.map((a) => `- ${a}`).join("\n")
        : "なし";
      savedPath = saveToObsidian({
        processId,
        audioFilename,
        rawTranscript,
        status: "captured",
        title: claude.title,
        type: claude.type,
        summary: claude.summary,
        formattedBody: claude.formatted_body,
        nextActions: nextActionsStr,
        reason: claude.reason,
      });
    } else {
      // Rescue: save raw transcript only
      savedPath = saveToObsidian({
        processId,
        audioFilename,
        rawTranscript,
        status: "transcript_only",
        title: `音声メモ_${audioFilename}`,
        type: "inbox",
        summary: "(Claude整形失敗 — 生文字起こしのみ)",
        formattedBody: rawTranscript,
        nextActions: "なし",
        reason: "Claude整形に失敗したため自動的にInboxへ保存",
      });
    }
    runLog.save_status = "success";
    clog(processId, "SAVE", `Saved to ${savedPath}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    runLog.save_status = "failed";
    runLog.error = (runLog.error ? runLog.error + " | " : "") + `SAVE: ${msg}`;
    runLog.finished_at = new Date().toISOString();
    appendRunLog(runLog);
    clog(processId, "ERROR", `Save failed: ${msg}`);
    if (NOTIFY_WEBHOOK_URL) await notifyFailure(processId, "SAVE", msg);
    process.exit(1);
  }

  // Step 4: Notify
  if (NOTIFY_WEBHOOK_URL) {
    clog(processId, "NOTIFY", "Sending...");
    const title = claude ? claude.title : `音声メモ_${audioFilename}`;
    const type = claude ? claude.type : "inbox";
    const ok = await notifySuccess(processId, title, type, savedPath);
    runLog.notify_status = ok ? "success" : "failed";
    clog(processId, "NOTIFY", ok ? "Sent" : "Failed (non-fatal)");
  }

  // Mark as processed
  markProcessed(fingerprint, processId);

  runLog.finished_at = new Date().toISOString();
  if (!runLog.error && runLog.orchestration_status === "failed") {
    runLog.error = "Orchestration failed — rescue save used";
  }
  appendRunLog(runLog);
  clog(processId, "DONE", "Pipeline complete");
}

main();
