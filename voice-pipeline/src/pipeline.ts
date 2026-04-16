import "dotenv/config";
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

// ============================================================
// Config
// ============================================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OBSIDIAN_VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH;
const NOTIFY_WEBHOOK_URL = process.env.NOTIFY_WEBHOOK_URL;
const NOTIFY_PROVIDER = process.env.NOTIFY_PROVIDER || "slack";

// ============================================================
// Types
// ============================================================

type ContentType = "task" | "project" | "log" | "daily_note" | "inbox";

interface FormattedResult {
  title: string;
  summary: string;
  formattedBody: string;
  nextActions: string;
  type: ContentType;
}

// ============================================================
// Logging
// ============================================================

const LOG_LINES: string[] = [];

function log(processId: string, step: string, message: string): void {
  const line = `[${new Date().toISOString()}] [${processId}] [${step}] ${message}`;
  console.log(line);
  LOG_LINES.push(line);
}

function writeLogFile(processId: string): void {
  const logDir = path.join(__dirname, "..", "logs");
  fs.mkdirSync(logDir, { recursive: true });
  const logFile = path.join(logDir, `${processId}.log`);
  fs.writeFileSync(logFile, LOG_LINES.join("\n") + "\n", "utf-8");
}

// ============================================================
// Step 1: Transcribe
// ============================================================

async function transcribe(
  openai: OpenAI,
  audioPath: string
): Promise<string> {
  const file = fs.createReadStream(audioPath);
  const response = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file,
    language: "ja",
  });
  return response.text;
}

// ============================================================
// Step 2+3: Format and Classify
// ============================================================

const FORMAT_SYSTEM_PROMPT = `あなたは音声メモの整形アシスタントです。以下の生文字起こしテキストを処理してください。

やること：
1. 口語ノイズ（えー、あのー、まあ等）を除去
2. 言い直し・繰り返しを整理
3. 文を適切に区切る
4. 要点を抽出（2-3文）
5. 仮タイトルを生成（短く具体的に）
6. 次アクションを抽出（なければ「なし」）
7. 種別を推定

種別の判定基準（優先順）：
1. 明確な作業指示・TODOがある → "task"
2. 継続案件・企画の話が中心 → "project"
3. 実施記録・振り返り → "log"
4. 当日雑記・日報的内容 → "daily_note"
5. 迷うもの → "inbox"

必ず以下のJSON形式のみで返してください：
{
  "title": "仮タイトル",
  "summary": "要点を2-3文で",
  "formattedBody": "整形された本文",
  "nextActions": "- アクション1\\n- アクション2",
  "type": "task|project|log|daily_note|inbox"
}`;

async function formatAndClassify(
  openai: OpenAI,
  transcript: string
): Promise<FormattedResult> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: FORMAT_SYSTEM_PROMPT },
      { role: "user", content: transcript },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned empty response during formatting");
  }

  const parsed = JSON.parse(content);
  const validTypes: ContentType[] = [
    "task",
    "project",
    "log",
    "daily_note",
    "inbox",
  ];
  if (!validTypes.includes(parsed.type)) {
    parsed.type = "inbox";
  }

  return parsed as FormattedResult;
}

// ============================================================
// Step 4: Save to Obsidian
// ============================================================

const FOLDER_MAP: Record<string, string> = {
  task: "Tasks",
  project: "Projects",
  log: "Logs",
  daily_note: "Daily Notes",
  inbox: "Inbox",
};

function saveToObsidian(data: {
  processId: string;
  audioFilename: string;
  rawTranscript: string;
  title: string;
  summary: string;
  formattedBody: string;
  nextActions: string;
  type: string;
}): string {
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
status: "captured"
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
`;

  fs.writeFileSync(filePath, markdown, "utf-8");
  return filePath;
}

// ============================================================
// Step 5: Notify
// ============================================================

async function notify(
  title: string,
  type: string,
  savedPath: string
): Promise<boolean> {
  if (!NOTIFY_WEBHOOK_URL) return false;

  const filename = path.basename(savedPath);
  let body: Record<string, unknown>;

  if (NOTIFY_PROVIDER === "discord") {
    body = {
      content: `音声メモ保存完了\n**${title}**\n種別: ${type}\n保存先: ${filename}`,
    };
  } else {
    // Slack format (default)
    body = {
      text: `音声メモ保存完了\n*${title}*\n種別: ${type}\n保存先: ${filename}`,
    };
  }

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
    console.error("Usage: npm run process -- <audio-file-path>");
    console.error("       npx tsx src/pipeline.ts <audio-file-path>");
    process.exit(1);
  }

  if (!OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY is not set");
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

  log(processId, "START", `Processing ${audioFilename}`);

  try {
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    // Step 1: Transcribe
    log(processId, "TRANSCRIBE", "Starting...");
    const rawTranscript = await transcribe(openai, audioPath);
    log(processId, "TRANSCRIBE", `Done (${rawTranscript.length} chars)`);

    // Step 2+3: Format and classify
    log(processId, "FORMAT", "Starting...");
    const formatted = await formatAndClassify(openai, rawTranscript);
    log(processId, "FORMAT", `Done — type=${formatted.type}, title="${formatted.title}"`);

    // Step 4: Save to Obsidian
    log(processId, "SAVE", "Saving...");
    const savedPath = saveToObsidian({
      processId,
      audioFilename,
      rawTranscript,
      ...formatted,
    });
    log(processId, "SAVE", `Saved to ${savedPath}`);

    // Step 5: Notify
    if (NOTIFY_WEBHOOK_URL) {
      log(processId, "NOTIFY", "Sending...");
      const ok = await notify(formatted.title, formatted.type, savedPath);
      log(processId, "NOTIFY", ok ? "Sent" : "Failed (non-fatal)");
    } else {
      log(processId, "NOTIFY", "Skipped (NOTIFY_WEBHOOK_URL not set)");
    }

    log(processId, "DONE", "Pipeline complete");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log(processId, "ERROR", message);
    writeLogFile(processId);
    console.error(`\nPipeline failed at process ${processId}. See logs/`);
    process.exit(1);
  }

  writeLogFile(processId);
}

main();
