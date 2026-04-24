import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  ChatInputCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  type ModalSubmitInteraction,
} from "discord.js";
import { createJob, getJob, pollJob, listJobs, retryJob, getArtifact } from "./discord-api";
import * as analyzeState from "./analyze-state";
import { callExecute, downloadAttachmentText, ExecutorError } from "./analyze-executor";
import { buildSuccessEmbed, buildExecutorErrorEmbed, buildExecutorErrorMessage } from "./analyze-embed";

const TOKEN = process.env.DISCORD_BOT_TOKEN;
if (!TOKEN) {
  console.error("DISCORD_BOT_TOKEN is required");
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", (c) => {
  console.log(`[discord-bot] Logged in as ${c.user.tag}`);
  analyzeState.ensureGcStarted();
});
client.on("interactionCreate", async (interaction) => {
  // Modal submit を最初にハンドル (analyze modal のみ対象)
  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith("analyze_modal:")) {
      try {
        await handleAnalyzeModal(interaction);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[discord-bot] Error in analyze modal submit:`, msg);
        const reply = { content: `エラーが発生しました: ${msg.slice(0, 200)}`, ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply).catch(() => {});
        } else {
          await interaction.reply(reply).catch(() => {});
        }
      }
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  try {
    switch (interaction.commandName) {
      case "memo":
        await handleMemo(interaction);
        break;
      // ... 他 case
      case "capture":
        await handleCapture(interaction);
        break;
      case "analyze":
        await handleAnalyze(interaction);
        break;
      default:
        await interaction.reply({ content: "未対応のコマンドです。", ephemeral: true });
    }
  } catch (err: unknown) {
    // ... エラーハンドリング (既存そのまま)
  }
});

// ============================================================
// /memo
// ============================================================

async function handleMemo(i: ChatInputCommandInteraction) {
  const text = i.options.getString("text", true);
  await i.deferReply();

  const created = await createJob({
    type: "memo_capture",
    instruction: text,
    source: "discord",
    requested_by: `${i.user.username} (${i.user.id})`,
  });

  await i.editReply(
    `📝 **受付完了**\nJob ID: \`${created.job_id}\`\nStatus: ${created.status}\n処理完了まで少しお待ちください...`
  );

  await waitAndReport(i, created.job_id);
}

// ============================================================
// /job
// ============================================================

async function handleJob(i: ChatInputCommandInteraction) {
  const type = i.options.getString("type", true);
  const instruction = i.options.getString("instruction", true);
  await i.deferReply();

  const created = await createJob({
    type,
    instruction,
    source: "discord",
    requested_by: `${i.user.username} (${i.user.id})`,
  });

  await i.editReply(
    `📝 **受付完了**\nJob ID: \`${created.job_id}\`\nType: ${type}\nStatus: ${created.status}\n処理完了まで少しお待ちください...`
  );

  await waitAndReport(i, created.job_id);
}

// ============================================================
// /status
// ============================================================

async function handleStatus(i: ChatInputCommandInteraction) {
  const jobId = i.options.getString("job_id", true);
  await i.deferReply();

  const job = await getJob(jobId);
  if (!job) {
    await i.editReply(`❌ Job \`${jobId}\` が見つかりませんでした。`);
    return;
  }

  await i.editReply(formatJobStatus(job));
}

// ============================================================
// /recent
// ============================================================

async function handleRecent(i: ChatInputCommandInteraction) {
  await i.deferReply();

  const items = await listJobs({ status: "completed", limit: 5 });
  if (items.length === 0) {
    await i.editReply("completed job はまだ見つかりませんでした。");
    return;
  }

  const blocks = items.map((j) => {
    // artifact_paths may be string or string[] in older ledger entries
    const paths = normalizePaths(j.artifact_paths);
    const pathLines = paths.length > 0
      ? paths.map((p) => `  - ${shortenPath(p)}`).join("\n")
      : "  なし";
    return `**job_id:** \`${j.job_id}\`\n**type:** ${j.type}\n**artifact_paths:**\n${pathLines}`;
  });

  await i.editReply(`📋 最近の completed job ${items.length}件です。\n\n${blocks.join("\n\n")}`);
}

// ============================================================
// /retry
// ============================================================

async function handleRetry(i: ChatInputCommandInteraction) {
  const jobId = i.options.getString("job_id", true);
  await i.deferReply();

  try {
    const result = await retryJob(jobId);
    await i.editReply(
      `🔄 **再投入しました。**\n元Job ID: \`${result.source_job_id}\`\n新Job ID: \`${result.job_id}\`\nType: ${result.type}\nStatus: ${result.status}`
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await i.editReply(`❌ 再投入できませんでした。\n理由: ${msg}`);
  }
}

// ============================================================
// /jobs
// ============================================================

async function handleJobs(i: ChatInputCommandInteraction) {
  const status = i.options.getString("status", true);
  const rawLimit = i.options.getInteger("limit") ?? 5;
  const limit = Math.min(Math.max(rawLimit, 1), 10);
  await i.deferReply();

  const items = await listJobs({ status, limit });
  if (items.length === 0) {
    await i.editReply(`該当する job は見つかりませんでした。(status: ${status})`);
    return;
  }

  const blocks = items.map((j) => {
    const paths = normalizePaths(j.artifact_paths);
    let block = `**job_id:** \`${j.job_id}\`\n**type:** ${j.type}\n**status:** ${j.status}`;
    if (paths.length > 0) {
      block += `\n**artifact_paths:**\n${paths.map((p) => `  - ${shortenPath(p)}`).join("\n")}`;
    }
    return block;
  });

  await i.editReply(`📋 **${status}** の job ${items.length}件です。\n\n${blocks.join("\n\n")}`);
}

// ============================================================
// /help
// ============================================================

// ============================================================
// /routine
// ============================================================

async function handleRoutine(i: ChatInputCommandInteraction) {
  const type = i.options.getString("type", true);
  const repo = i.options.getString("repo", true);
  const target = i.options.getString("target", true);
  const focus = i.options.getString("focus") ?? undefined;
  const depth = i.options.getString("depth") ?? undefined;
  const spec = i.options.getString("spec") ?? undefined;

  await i.deferReply();

  try {
    const { createRoutine } = await import("./discord-api");
    const result = await createRoutine({
      type, repo, target, focus, depth, spec,
      source: "discord",
      requested_by: `${i.user.username} (${i.user.id})`,
    });

    await i.editReply([
      `🚀 **Routine 起動**`,
      `Type: \`${type}\``,
      `Repo: \`${repo}\``,
      `Target: \`${target}\``,
      focus ? `Focus: \`${focus}\`` : null,
      depth ? `Depth: \`${depth}\`` : null,
      ``,
      `Job ID: \`${result.job_id}\``,
      `Status: ${result.status}`,
      ``,
      `朝サマリーで結果を確認できます。`,
    ].filter((x) => x !== null).join("\n"));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await i.editReply(`❌ Routine 起動に失敗: ${msg.slice(0, 500)}`);
  }
}

// ============================================================
// /retry_routine
// ============================================================

async function handleRetryRoutine(i: ChatInputCommandInteraction) {
  const jobId = i.options.getString("job_id", true);

  if (!jobId.startsWith("RJOB-")) {
    await i.reply({
      content: `❌ \`${jobId}\` は Routine job ではありません。ID は \`RJOB-\` で始まります。\n通常 job の再試行は \`/retry\` を使ってください。`,
      ephemeral: true,
    });
    return;
  }

  await i.deferReply();

  try {
    const { retryRoutine } = await import("./discord-api");
    const result = await retryRoutine(jobId);

    if (!result.ok) {
      await i.editReply(`⚠️ 再試行できませんでした: ${result.reason}`);
      return;
    }

    await i.editReply([
      `🔄 **Routine 再投入**`,
      `Job ID: \`${result.job_id}\``,
      `Status: ${result.status}`,
    ].join("\n"));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await i.editReply(`❌ 再試行に失敗: ${msg.slice(0, 500)}`);
  }
}

// ============================================================
// /capture
// ============================================================

async function handleCapture(i: ChatInputCommandInteraction) {
  const text = i.options.getString("text", true);
  const tags = i.options.getString("tags") ?? undefined;

  await i.reply({ content: "📥 Captured. 次アクション生成中...", ephemeral: true });

  try {
    const res = await fetch(`${process.env.VOICE_PIPELINE_API_BASE_URL || ""}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.INGEST_API_KEY ? { Authorization: `Bearer ${process.env.INGEST_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        text,
        tags,
        source: "discord",
        requested_by: `${i.user.username} (${i.user.id})`,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      await i.followUp({ content: `❌ Capture 失敗: ${body.slice(0, 200)}`, ephemeral: true });
      return;
    }

    const data = (await res.json()) as { job_id: string; inbox_path: string };
    await i.followUp({
      content: [
        `✅ **Inbox に保存しました**`,
        `Job ID: \`${data.job_id}\``,
        `保存先: \`${data.inbox_path}\``,
        `次アクション候補は処理完了後に確認できます。`,
      ].join("\n"),
      ephemeral: true,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await i.followUp({ content: `❌ エラー: ${msg.slice(0, 300)}`, ephemeral: true });
  }
}

// ============================================================
// /help
// ============================================================

async function handleHelp(i: ChatInputCommandInteraction) {
  const text = `📘 **スマホ司令塔 早見表**

**投げる**
\`/memo\` — とりあえず残す
\`/job\` — 用途別の成果物を作る

**見る**
\`/status\` — 1件の状態確認
\`/recent\` — 直近の completed を見る
\`/jobs\` — status ごとの一覧を見る

**立て直す**
\`/retry\` — failed job を再投入

**迷った時**
何か残したい → \`/memo\`
用途別に作りたい → \`/job\`
1件だけ確認 → \`/status\`
最近の結果 → \`/recent\`
一覧で見たい → \`/jobs\`
失敗やり直し → \`/retry\`

⚠ \`/retry\` は failed job のみ対象です。`;

  await i.reply({ content: text, ephemeral: true });
}

// ============================================================
// /artifact
// ============================================================

const ARTIFACT_MAX_CHARS = 1400;

async function handleArtifact(i: ChatInputCommandInteraction) {
  const jobId = i.options.getString("job_id", true);
  await i.deferReply();

  try {
    const a = await getArtifact(jobId);
    let body = a.content;
    let truncated = false;
    if (body.length > ARTIFACT_MAX_CHARS) {
      body = body.slice(0, ARTIFACT_MAX_CHARS);
      truncated = true;
    }
    const lines = [
      `📄 **成果物を表示します。**`,
      `**job_id:** \`${a.job_id}\``,
      `**type:** ${a.type}`,
      `**artifact_path:** ${shortenPath(a.artifact_path)}`,
      ``,
      `**本文:**`,
      body,
    ];
    if (truncated) lines.push(`\n（長いため冒頭のみ表示）`);
    await i.editReply(lines.join("\n"));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await i.editReply(`❌ ${msg}`);
  }
}

function normalizePaths(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((s) => typeof s === "string");
  if (typeof v === "string") return [v];
  return [];
}

function shortenPath(p: string): string {
  const segs = p.replace(/\\/g, "/").split("/").filter(Boolean);
  if (segs.length <= 2) return segs.join("/");
  return segs.slice(-2).join("/");
}

// ============================================================
// Helpers
// ============================================================

async function waitAndReport(i: ChatInputCommandInteraction, jobId: string) {
  const job = await pollJob(jobId, 60_000, 5_000);
  if (!job) return;

  if (job.status === "completed" || job.status === "failed") {
    await i.followUp(formatJobStatus(job));
  } else {
    await i.followUp(
      `⏳ まだ処理中です。\nJob ID: \`${jobId}\`\n\`/status job_id:${jobId}\` で確認できます。`
    );
  }
}

function formatJobStatus(job: { job_id: string; status: string; result_summary?: string | null; artifact_paths?: string[]; error_message?: string | null }): string {
  const icon = job.status === "completed" ? "✅" : job.status === "failed" ? "❌" : "⏳";
  const lines: string[] = [
    `${icon} **${job.status}**`,
    `Job ID: \`${job.job_id}\``,
  ];

  if (job.result_summary) {
    lines.push(`結果: ${job.result_summary}`);
  }
  if (job.artifact_paths && job.artifact_paths.length > 0) {
    lines.push(`保存先: ${job.artifact_paths.map((p) => `\`${p}\``).join(", ")}`);
  }
  if (job.status === "failed" && job.error_message) {
    lines.push(`エラー: ${job.error_message.slice(0, 300)}`);
  }

  return lines.join("\n");
}

client.login(TOKEN);

const ALLOWED_EXTENSIONS = [".txt", ".md"];
const MAX_ATTACHMENT_SIZE_BYTES = 1_048_576;

async function handleAnalyze(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const templateType = interaction.options.getString("template_type", true) as
    | "structure_note"
    | "report_draft"
    | "json";
  const attachment = interaction.options.getAttachment("attachment");

  if (attachment) {
    const lowerName = attachment.name.toLowerCase();
    const hasAllowedExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    if (!hasAllowedExt) {
      await interaction.reply({
        content: `添付ファイルは .txt か .md のみ対応ッピ。(${attachment.name})`,
        ephemeral: true,
      });
      return;
    }
    if (attachment.size > MAX_ATTACHMENT_SIZE_BYTES) {
      const sizeKb = Math.floor(attachment.size / 1024);
      await interaction.reply({
        content: `添付ファイルは 1 MB 以下にしてッピ。(現在 ${sizeKb} KB)`,
        ephemeral: true,
      });
      return;
    }
  }

  const requestId = analyzeState.createRequestId();
  analyzeState.put(requestId, {
    userId: interaction.user.id,
    templateType,
    attachmentUrl: attachment?.url ?? null,
    filename: attachment?.name ?? null,
    size: attachment?.size ?? null,
    createdAt: Date.now(),
  });

  const modal = buildAnalyzeModal(requestId, attachment !== null);
  await interaction.showModal(modal);
}

function buildAnalyzeModal(requestId: string, hasAttachment: boolean): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(`analyze_modal:${requestId}`)
    .setTitle("Analyze 入力");

  const titleInput = new TextInputBuilder()
    .setCustomId("title")
    .setLabel("title")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
  );

  if (!hasAttachment) {
    const sourceTextInput = new TextInputBuilder()
      .setCustomId("source_text")
      .setLabel("source_text")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(4000);
    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(sourceTextInput),
    );
  }

  const metadataInput = new TextInputBuilder()
    .setCustomId("metadata_json")
    .setLabel("metadata_json (任意、空なら {})")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(500);
  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(metadataInput),
  );

  return modal;
}

async function handleAnalyzeModal(
  interaction: ModalSubmitInteraction,
): Promise<void> {
  const requestId = interaction.customId.slice("analyze_modal:".length);
  const payload = analyzeState.get(requestId);

  if (!payload || analyzeState.isExpired(payload)) {
    analyzeState.del(requestId);
    await interaction.reply({
      content: "セッションが切れたッピ。もう一度 /analyze からやり直してッピ。",
      ephemeral: true,
    });
    return;
  }
  if (payload.userId !== interaction.user.id) {
    await interaction.reply({
      content: "このモーダルは別ユーザーのものッピ。自分で /analyze を叩いてッピ。",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  let sourceText: string;
  if (payload.attachmentUrl) {
    try {
      sourceText = await downloadAttachmentText(payload.attachmentUrl);
    } catch (err) {
      analyzeState.del(requestId);
      const isDecodeError = err instanceof TypeError;
      const content = isDecodeError
        ? "添付ファイルの文字コードが読めなかったッピ。UTF-8 で保存し直してッピ。"
        : "添付ファイルの取得に失敗したッピ。もう一度試してッピ。";
      await interaction.editReply({ content });
      return;
    }
  } else {
    sourceText = interaction.fields.getTextInputValue("source_text");
  }

  const title = interaction.fields.getTextInputValue("title");

  const metadataRaw = (
    interaction.fields.getTextInputValue("metadata_json") ?? ""
  ).trim();
  let metadata: Record<string, unknown> = {};
  if (metadataRaw) {
    try {
      const parsed = JSON.parse(metadataRaw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        metadata = parsed as Record<string, unknown>;
      }
    } catch {
      metadata = {};
    }
  }

  let result;
  try {
    result = await callExecute({
      source_text: sourceText,
      template_type: payload.templateType,
      title,
      metadata,
    });
  } catch (err) {
    analyzeState.del(requestId);
    if (err instanceof ExecutorError) {
      const msg = buildExecutorErrorMessage(err.kind, err.detail);
      await interaction.editReply({ content: msg });
    } else {
      const detail = err instanceof Error ? err.message : String(err);
      await interaction.editReply({
        content: `不明なエラーッピ。\n詳細: ${detail.slice(0, 500)}`,
      });
    }
    return;
  }

  analyzeState.del(requestId);

  if (result.status === "error") {
    const embed = buildExecutorErrorEmbed(result);
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const embed = buildSuccessEmbed(result);
  await interaction.editReply({ embeds: [embed] });
}