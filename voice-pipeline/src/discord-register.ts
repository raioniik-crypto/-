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
