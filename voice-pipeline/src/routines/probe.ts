import * as yaml from "js-yaml";
import { RoutineHandler, RoutineJob, RepoCapabilityReport } from "../types";
import { runRepoCapabilityProbe } from "./_preflight";

function renderReportAsMarkdown(report: RepoCapabilityReport): string {
  const frontmatter = yaml.dump({
    type: "repo-capability-report",
    repo: report.repo,
    probed_at: report.probed_at,
    default_branch: report.default_branch,
    is_private: report.is_private,
    tags: ["スマホ司令塔", "probe", "repo-capability"],
  }, { lineWidth: -1 });

  const lines = [
    "---", frontmatter.trim(), "---", "",
    `# Repo Capability Report: ${report.repo}`, "",
    "## 基本情報", "",
    `- **Default Branch**: \`${report.default_branch}\``,
    `- **Visibility**: ${report.is_private ? "private" : "public"}`,
    `- **Probed At**: ${report.probed_at}`, "",
    "## ブランチ保護", "",
    `- Enabled: ${report.branch_protection.enabled ? "Yes" : "No"}`,
  ];
  if (report.branch_protection.details) {
    lines.push(`- Details: ${JSON.stringify(report.branch_protection.details).slice(0, 200)}`);
  }
  lines.push("", "## GitHub Token 権限", "",
    `- Authenticated User: \`${report.github_token.authenticated_user ?? "unknown"}\``,
    `- Permission Level: \`${report.github_token.permission_level}\``,
    `- Can Read: ${report.github_token.can_read ? "✅" : "❌"}`,
    `- Can Write: ${report.github_token.can_write ? "✅" : "❌"}`,
    `- Can Create PR: ${report.github_token.can_create_pr ? "✅" : "❌"}`,
    "", "## プロジェクト構造", "",
    `- **Package Manager**: \`${report.project.package_manager}\``,
    `- **Workspace Root**: \`${report.project.workspace_root}\``,
    `- **Test Command**: ${report.project.test_command ? `\`${report.project.test_command}\`` : "未検出"}`,
    `- **Test Note**: ${report.project.test_command_note}`,
    `- **Monorepo**: ${report.project.is_monorepo ? "Yes" : "No"}`,
  );

  if (report.warnings.length > 0) {
    lines.push("", "## ⚠️ 警告", "");
    for (const w of report.warnings) lines.push(`- ${w}`);
  }
  if (report.checks_skipped.length > 0) {
    lines.push("", "## 🚫 スキップされた検査", "");
    for (const s of report.checks_skipped) lines.push(`- ${s}`);
  }
  lines.push("");
  return lines.join("\n");
}

function summarizeReport(report: RepoCapabilityReport): string {
  const parts = [
    `default_branch=${report.default_branch}`,
    `pm=${report.project.package_manager}`,
    report.github_token.can_create_pr ? "PR可" : "PR不可",
    report.warnings.length > 0 ? `警告${report.warnings.length}件` : "警告なし",
  ];
  return parts.join(", ");
}

export const probeHandler: RoutineHandler = {
  name: "probe",
  max_duration_ms: 5 * 60 * 1000, // 5 min (probe is lightweight)
  required_env: ["GITHUB_TOKEN"],
  system_prompt: `あなたは Repo Capability Probe の実行者です。
対象リポジトリの capability を機械的に検査し、結果を JSON で返してください。
このプロンプトは実際には routine-worker が直接 probe を実行するため呼ばれません。`,

  build_prompt(job: RoutineJob): string {
    const args = job.args as { repo?: string };
    return `Probe repo: ${args.repo ?? "unknown"}`;
  },
};

// Direct execution (called from routine-worker instead of Claude Code CLI)
export async function executeProbe(job: RoutineJob): Promise<{
  artifactPaths: string[];
  summary: string;
}> {
  const args = job.args as { repo?: string };
  const repo = args.repo;
  if (!repo) throw new Error("probe requires repo argument");

  const report = await runRepoCapabilityProbe(repo);

  const { putFile } = await import("../github-store");
  const dateStr = new Date().toISOString().slice(0, 10);
  const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, "");
  const repoSlug = repo.replace(/[/\\:*?"<>|]/g, "_");
  const vaultBase = process.env.GITHUB_VAULT_PATH
    ? process.env.GITHUB_VAULT_PATH.replace(/\/+$/, "") + "/"
    : "";

  const jsonPath = `${vaultBase}03_開発/Repo Capability Reports/${dateStr}_${timeStr}_${repoSlug}.json`;
  const mdPath = `${vaultBase}03_開発/Repo Capability Reports/${dateStr}_${timeStr}_${repoSlug}.md`;

  await putFile(jsonPath, JSON.stringify(report, null, 2), `probe: ${repo} (${dateStr})`);
  await putFile(mdPath, renderReportAsMarkdown(report), `probe: ${repo} md (${dateStr})`);

  return {
    artifactPaths: [jsonPath, mdPath],
    summary: summarizeReport(report),
  };
}
