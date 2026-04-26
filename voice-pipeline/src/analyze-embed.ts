import { EmbedBuilder, Colors } from "discord.js";
import type { ExecuteResponse, GenerationMeta, QualityCheck, ExecutorErrorKind } from "./analyze-executor";

const GITHUB_VAULT_BASE = "https://github.com/raioniik-crypto/my-vault/blob/main";

const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  structure_note: "思想ノート (structure_note)",
  report_draft: "レポート (report_draft)",
  json: "JSON出力 (json)",
};

const SECRET_PATTERNS: Array<[RegExp, string]> = [
  [/(X-API-Key\s*[:=]\s*)[^\s,;]+/gi, "$1***REDACTED***"],
  [/(Authorization\s*[:=]\s*)[^,;\n]+/gi, "$1***REDACTED***"],
  [/(api[_-]?key\s*[:=]\s*)[^\s,;]+/gi, "$1***REDACTED***"],
  [/(token\s*[:=]\s*)[^\s,;]+/gi, "$1***REDACTED***"],
  [/(Bearer\s+)[^\s,;]+/gi, "$1***REDACTED***"],
];

export function redactSecrets(text: string): string {
  if (!text) return text;
  let result = text;
  for (const [pat, repl] of SECRET_PATTERNS) {
    result = result.replace(pat, repl);
  }
  return result;
}

export function truncate(text: string | null | undefined, limit: number): string {
  if (!text) return "";
  if (text.length <= limit) return text;
  return text.slice(0, limit - 3) + "...";
}

function vaultUrl(vaultPath: string): string {
  return `${GITHUB_VAULT_BASE}/${encodeURI(vaultPath)}`;
}

function formatQualityScores(qc: QualityCheck): string {
  const axes: Array<keyof QualityCheck> = [
    "structure", "causality", "revision",
    "tradeoff", "genealogy", "agency", "view_update",
  ];
  const fmt = (a: keyof QualityCheck) => `${a}: ${qc[a] ?? "?"}`;
  const line1 = axes.slice(0, 3).map(fmt).join(" | ");
  const line2 = axes.slice(3).map(fmt).join(" | ");
  return `${line1}\n${line2}`;
}

function formatWeakPoints(weak: string[] | undefined): string {
  if (!weak || weak.length === 0) return "なし";
  return weak.join(", ");
}

function formatGenerationMeta(meta: GenerationMeta): string {
  const totals = meta.quality_totals.length > 0
    ? meta.quality_totals.join(" → ")
    : String(meta.selected_total);
  const adopted = meta.selected_attempt_index === 0
    ? "初回"
    : `${meta.selected_attempt_index + 1}回目`;
  return `あり ${totals} / 採用: ${adopted}`;
}

export function buildSuccessEmbed(result: ExecuteResponse): EmbedBuilder {
  const qc = result.quality_check ?? {};
  const needsRevision = qc.needs_revision ?? false;
  const color = needsRevision ? Colors.Orange : Colors.Green;

  const title = result.title || "(no title)";
  const vaultPath = result.vault_path || "";
  const templateLabel = TEMPLATE_TYPE_LABELS[result.template_type] ?? result.template_type;

  const embed = new EmbedBuilder()
    .setTitle(`📝 ${truncate(title, 200)}`)
    .setColor(color);

  if (vaultPath) {
    embed.addFields({
      name: "📂 Vault",
      value: `[${truncate(vaultPath, 100)}](${vaultUrl(vaultPath)})`,
    });
  }
  embed.addFields({ name: "🏷️ Template", value: templateLabel });

  const total = qc.total ?? "?";
  const statusMark = needsRevision ? "⚠️" : "✅";
  embed.addFields({
    name: `品質チェック: ${total}/35 ${statusMark}`,
    value: formatQualityScores(qc),
  });

  embed.addFields({
    name: "weak_points",
    value: formatWeakPoints(qc.weak_points),
  });

  if (result.meta?.regenerated) {
    embed.addFields({
      name: "再生成",
      value: formatGenerationMeta(result.meta),
    });
  }

  const preview = truncate(result.content_preview, 500);
  if (preview) {
    embed.addFields({
      name: "Preview",
      value: "```\n" + preview + "\n```",
    });
  }

  return embed;
}

export function buildExecutorErrorEmbed(result: ExecuteResponse): EmbedBuilder {
  const qc = result.quality_check ?? {};
  const embed = new EmbedBuilder()
    .setTitle(`⚠️ ${truncate(result.title || "(no title)", 200)}`)
    .setDescription("生成は成功したが Vault 保存に失敗したッピ。以下の preview から救出可能ッピ。")
    .setColor(Colors.Orange);

  const safeMessage = truncate(redactSecrets(result.message || ""), 500);
  if (safeMessage) {
    embed.addFields({ name: "エラー詳細", value: safeMessage });
  }

  if (Object.keys(qc).length > 0) {
    const total = qc.total ?? "?";
    embed.addFields({
      name: `品質チェック: ${total}/35`,
      value: formatQualityScores(qc),
    });
    embed.addFields({
      name: "weak_points",
      value: formatWeakPoints(qc.weak_points),
    });
  }

  if (result.meta?.regenerated) {
    embed.addFields({
      name: "再生成",
      value: formatGenerationMeta(result.meta),
    });
  }

  const preview = truncate(result.content_preview, 500);
  if (preview) {
    embed.addFields({
      name: "Preview",
      value: "```\n" + preview + "\n```",
    });
  }

  return embed;
}

export function buildExecutorErrorMessage(kind: ExecutorErrorKind, detail: string): string {
  const safeDetail = truncate(redactSecrets(detail), 500);
  switch (kind) {
    case "auth":
      return "structure-note-executor の認証に失敗したッピ。API Key 設定を確認してッピ。";
    case "timeout":
      return "structure-note-executor の応答がタイムアウトしたッピ (120 秒超過)。Render の状態を確認してッピ。";
    case "server":
      return `structure-note-executor がエラーを返したッピ。Render のログを確認してッピ。\n詳細: ${safeDetail}`;
    case "network":
      return `structure-note-executor に接続できなかったッピ。\n詳細: ${safeDetail}`;
    default:
      return `不明なエラーッピ。\n詳細: ${safeDetail}`;
  }
}