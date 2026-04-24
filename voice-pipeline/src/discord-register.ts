import "dotenv/config";
import { REST, Routes, SlashCommandBuilder } from "discord.js";

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const APP_ID = process.env.DISCORD_APPLICATION_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!TOKEN || !APP_ID) {
  console.error("DISCORD_BOT_TOKEN and DISCORD_APPLICATION_ID are required");
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder()
    .setName("memo")
    .setDescription("音声メモ風にテキストを保存する")
    .addStringOption((o) =>
      o.setName("text").setDescription("メモ内容").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("job")
    .setDescription("任意の job を作成する")
    .addStringOption((o) =>
      o
        .setName("type")
        .setDescription("job 種別")
        .setRequired(true)
        .addChoices(
          { name: "memo_capture", value: "memo_capture" },
          { name: "content_draft", value: "content_draft" },
          { name: "dev_brief", value: "dev_brief" },
          { name: "x_post", value: "x_post" },
          { name: "instagram_caption", value: "instagram_caption" }
        )
    )
    .addStringOption((o) =>
      o.setName("instruction").setDescription("指示内容").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("status")
    .setDescription("job の状態を確認する")
    .addStringOption((o) =>
      o.setName("job_id").setDescription("JOB-XXXXXXXX-XXXXXX").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("recent")
    .setDescription("直近の完了 job を確認する"),

  new SlashCommandBuilder()
    .setName("retry")
    .setDescription("失敗した job を再投入する")
    .addStringOption((o) =>
      o.setName("job_id").setDescription("再投入する job の ID").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("jobs")
    .setDescription("status ごとの job 一覧を表示する")
    .addStringOption((o) =>
      o
        .setName("status")
        .setDescription("表示する status")
        .setRequired(true)
        .addChoices(
          { name: "completed", value: "completed" },
          { name: "queued", value: "queued" },
          { name: "running", value: "running" },
          { name: "failed", value: "failed" }
        )
    )
    .addIntegerOption((o) =>
      o.setName("limit").setDescription("表示件数 (デフォルト5, 最大10)").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("help")
    .setDescription("コマンド早見表を表示する"),

  new SlashCommandBuilder()
    .setName("artifact")
    .setDescription("job の成果物本文を表示する")
    .addStringOption((o) =>
      o.setName("job_id").setDescription("JOB-XXXXXXXX-XXXXXX").setRequired(true)
    ),

  // --- Routine commands (Phase 1 Task 6) ---
  new SlashCommandBuilder()
    .setName("routine")
    .setDescription("Routine を起動する（code_review 等）")
    .addStringOption((o) =>
      o.setName("type").setDescription("Routine 種別").setRequired(true)
        .addChoices(
          { name: "code_review", value: "code_review" },
          { name: "probe", value: "probe" },
          { name: "spec_to_design", value: "spec_to_design" }
        )
    )
    .addStringOption((o) =>
      o.setName("repo").setDescription("対象リポジトリ（owner/repo 形式）").setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("target").setDescription("対象（例: branch:main / path:src/ branch:main / pr:42）").setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("focus").setDescription("重点観点").setRequired(false)
        .addChoices(
          { name: "general", value: "general" },
          { name: "security", value: "security" },
          { name: "performance", value: "performance" },
          { name: "readability", value: "readability" },
          { name: "architecture", value: "architecture" }
        )
    )
    .addStringOption((o) =>
      o.setName("depth").setDescription("レビュー深さ").setRequired(false)
        .addChoices(
          { name: "light", value: "light" },
          { name: "standard", value: "standard" },
          { name: "deep", value: "deep" }
        )
    )
    .addStringOption((o) =>
      o.setName("spec").setDescription("仕様本文（spec_to_design 用）").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("retry_routine")
    .setDescription("Routine job を再試行する（RJOB- で始まる ID）")
    .addStringOption((o) =>
      o.setName("job_id").setDescription("RJOB-YYYYMMDD-XXXXXX").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("capture")
    .setDescription("テキストを Inbox に保存し、AI が次アクション候補を返す")
    .addStringOption((o) =>
      o.setName("text").setDescription("キャプチャするテキスト").setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("tags").setDescription("タグ（カンマ区切り）").setRequired(false)
   ),

   new SlashCommandBuilder()
    .setName("analyze")
    .setDescription("source_text を structure-note-executor で解析する")
    .addStringOption((option) =>
      option
        .setName("template_type")
        .setDescription("生成テンプレート種別")
        .setRequired(true)
        .addChoices(
          { name: "思想ノート (structure_note)", value: "structure_note" },
          { name: "レポート (report_draft)", value: "report_draft" },
          { name: "JSON出力 (json)", value: "json" },
        ),
    )
    .addAttachmentOption((option) =>
      option
        .setName("attachment")
        .setDescription("(任意) .txt または .md ファイル、1 MB 以下")
        .setRequired(false),
    ),
].map((c) => c.toJSON());

async function main() {
  const rest = new REST({ version: "10" }).setToken(TOKEN!);

  if (GUILD_ID) {
    console.log(`Registering ${commands.length} guild commands (guild: ${GUILD_ID})...`);
    await rest.put(Routes.applicationGuildCommands(APP_ID!, GUILD_ID), { body: commands });
  } else {
    console.log(`Registering ${commands.length} global commands...`);
    await rest.put(Routes.applicationCommands(APP_ID!), { body: commands });
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error("Registration failed:", err);
  process.exit(1);
});
