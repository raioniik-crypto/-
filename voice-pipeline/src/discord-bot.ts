import "dotenv/config";
import { Client, GatewayIntentBits, ChatInputCommandInteraction } from "discord.js";
import { createJob, getJob, pollJob, listJobs, retryJob } from "./discord-api";

const TOKEN = process.env.DISCORD_BOT_TOKEN;
if (!TOKEN) {
  console.error("DISCORD_BOT_TOKEN is required");
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", (c) => {
  console.log(`[discord-bot] Logged in as ${c.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    switch (interaction.commandName) {
      case "memo":
        await handleMemo(interaction);
        break;
      case "job":
        await handleJob(interaction);
        break;
      case "status":
        await handleStatus(interaction);
        break;
      case "recent":
        await handleRecent(interaction);
        break;
      case "retry":
        await handleRetry(interaction);
        break;
      default:
        await interaction.reply({ content: "未対応のコマンドです。", ephemeral: true });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[discord-bot] Error in /${interaction.commandName}:`, msg);
    const reply = { content: `エラーが発生しました: ${msg.slice(0, 200)}`, ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply).catch(() => {});
    } else {
      await interaction.reply(reply).catch(() => {});
    }
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
