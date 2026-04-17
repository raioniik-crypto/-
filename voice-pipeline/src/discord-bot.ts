import "dotenv/config";
import { Client, GatewayIntentBits, ChatInputCommandInteraction } from "discord.js";
import { createJob, getJob, pollJob, listJobs } from "./discord-api";

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
    await i.editReply("完了した job はまだありません。");
    return;
  }

  const lines = items.map((j) => {
    const paths = j.artifact_paths.length > 0
      ? j.artifact_paths.map((p) => `\`${p}\``).join(", ")
      : "なし";
    return `• \`${j.job_id}\` [${j.type}] → ${paths}`;
  });

  await i.editReply(`📋 **直近の完了 job (${items.length}件)**\n${lines.join("\n")}`);
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
