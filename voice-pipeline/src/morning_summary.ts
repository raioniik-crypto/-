import * as yaml from "js-yaml";
import { listDir, getFile, putFile } from "./github-store";
import { sendToDiscordWebhook } from "./discord-notify";
import { RoutineJob } from "./types";

interface SummaryContext {
  date: string;
  completed: RoutineJob[];
  blocked: RoutineJob[];
  failed: RoutineJob[];
}

async function collectFromStatus(status: string, dateStr: string): Promise<RoutineJob[]> {
  const files = await listDir(`system/routine_jobs/${status}`);
  const jobs: RoutineJob[] = [];
  for (const f of files.filter((n) => n.endsWith(".json"))) {
    const content = await getFile(`system/routine_jobs/${status}/${f}`);
    if (!content) continue;
    try {
      const job = JSON.parse(content) as RoutineJob;
      if (job.updated_at && job.updated_at.startsWith(dateStr)) {
        jobs.push(job);
      }
    } catch { /* skip malformed */ }
  }
  return jobs;
}

export async function collectLastBatch(date: string): Promise<SummaryContext> {
  const yesterday = new Date(date + "T00:00:00+09:00");
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const completed = [
    ...(await collectFromStatus("completed", yesterdayStr)),
    ...(await collectFromStatus("completed", date)),
  ];
  const blocked = [
    ...(await collectFromStatus("waiting_approval", yesterdayStr)),
    ...(await collectFromStatus("waiting_approval", date)),
  ];
  const failed = [
    ...(await collectFromStatus("failed", yesterdayStr)),
    ...(await collectFromStatus("failed", date)),
  ];

  return { date, completed, blocked, failed };
}

function formatDuration(job: RoutineJob): string {
  if (!job.created_at || !job.updated_at) return "不明";
  const start = new Date(job.created_at).getTime();
  const end = new Date(job.updated_at).getTime();
  const sec = Math.round((end - start) / 1000);
  if (sec < 60) return `${sec}秒`;
  return `${Math.floor(sec / 60)}分${sec % 60}秒`;
}

function shortenPath(p: string): string {
  const segs = p.replace(/\\/g, "/").split("/").filter(Boolean);
  if (segs.length <= 2) return segs.join("/");
  return segs.slice(-2).join("/");
}

export function renderFullMarkdown(ctx: SummaryContext): string {
  const frontmatter = yaml.dump({
    type: "morning-summary",
    date: ctx.date,
    job_counts: {
      completed: ctx.completed.length,
      blocked: ctx.blocked.length,
      failed: ctx.failed.length,
    },
    tags: ["スマホ司令塔", "morning-summary"],
  }, { lineWidth: -1 });

  const lines: string[] = [
    "---",
    frontmatter.trim(),
    "---",
    "",
    `# 朝サマリー ${ctx.date}`,
    "",
    "## 📊 昨夜のサマリー",
    "",
  ];

  // Completed
  lines.push(`> [!success] 完走した Routine (${ctx.completed.length} 件)`);
  if (ctx.completed.length === 0) {
    lines.push("> なし");
  } else {
    for (const j of ctx.completed) {
      const paths = (j.artifact_paths ?? []).map(shortenPath).join(", ");
      lines.push(`> - **${j.job_id}**: ${j.type} (${formatDuration(j)})`);
      if (paths) lines.push(`>   - 成果物: \`${paths}\``);
      if (j.result_summary) lines.push(`>   - ${j.result_summary}`);
    }
  }
  lines.push("");

  // Blocked
  lines.push(`> [!warning] 承認待ち (${ctx.blocked.length} 件)`);
  if (ctx.blocked.length === 0) {
    lines.push("> なし");
  } else {
    for (const j of ctx.blocked) {
      lines.push(`> - **${j.job_id}**: ${j.type}`);
      if (j.result_summary) lines.push(`>   - ${j.result_summary}`);
    }
  }
  lines.push("");

  // Failed
  lines.push(`> [!bug] 失敗 (${ctx.failed.length} 件)`);
  if (ctx.failed.length === 0) {
    lines.push("> なし");
  } else {
    for (const j of ctx.failed) {
      lines.push(`> - **${j.job_id}**: ${j.type}`);
      if (j.error_message) lines.push(`>   - エラー: ${j.error_message.slice(0, 200)}`);
    }
  }
  lines.push("");

  return lines.join("\n");
}

export function renderDiscordShort(ctx: SummaryContext, vaultPath: string): string {
  const lines: string[] = [
    `📊 **朝サマリー ${ctx.date}**`,
    "",
    `✅ 完走: ${ctx.completed.length} 件`,
    `⏸ 承認待ち: ${ctx.blocked.length} 件`,
    `❌ 失敗: ${ctx.failed.length} 件`,
  ];

  if (ctx.completed.length > 0) {
    lines.push("", "**完走した Routine:**");
    for (const j of ctx.completed.slice(0, 5)) {
      lines.push(`• ${j.job_id} (${j.type}) - ${formatDuration(j)}`);
    }
    if (ctx.completed.length > 5) {
      lines.push(`• …他 ${ctx.completed.length - 5} 件`);
    }
  }

  if (ctx.blocked.length > 0) {
    lines.push("", "**承認待ち:**");
    for (const j of ctx.blocked.slice(0, 3)) {
      lines.push(`• ${j.job_id} (${j.type})`);
    }
  }

  if (ctx.failed.length > 0) {
    lines.push("", "**失敗:**");
    for (const j of ctx.failed.slice(0, 3)) {
      lines.push(`• ${j.job_id}: ${(j.error_message ?? "").slice(0, 80)}`);
    }
  }

  lines.push("", `📎 詳細: \`${shortenPath(vaultPath)}\``);

  const text = lines.join("\n");
  return text.length > 1800 ? text.slice(0, 1797) + "..." : text;
}

export async function saveToVault(date: string, markdown: string): Promise<string> {
  const vaultBase = process.env.GITHUB_VAULT_PATH
    ? process.env.GITHUB_VAULT_PATH.replace(/\/+$/, "") + "/"
    : "";
  const repoPath = `${vaultBase}03_開発/Morning Summaries/${date}_morning-summary.md`;
  await putFile(repoPath, markdown, `morning summary: ${date}`);
  return repoPath;
}

export async function generateAndDeliverMorningSummary(dateStr: string): Promise<void> {
  console.log(`[morning-summary] Generating for ${dateStr}`);

  const ctx = await collectLastBatch(dateStr);
  const total = ctx.completed.length + ctx.blocked.length + ctx.failed.length;

  if (total === 0) {
    console.log("[morning-summary] No routine jobs found for this period, skipping");
    return;
  }

  const fullMd = renderFullMarkdown(ctx);
  const vaultPath = await saveToVault(dateStr, fullMd);
  console.log(`[morning-summary] Saved to vault: ${vaultPath}`);

  const shortMsg = renderDiscordShort(ctx, vaultPath);
  await sendToDiscordWebhook(shortMsg);
  console.log("[morning-summary] Discord notification sent");
}
