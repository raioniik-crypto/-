---
type: audit-log
target: voice-pipeline src/ の環境変数参照
created: 2026-04-18
purpose: Phase 1 Task 3 追加修正の調査記録
---

# 環境変数監査レポート（Phase 1 Task 3 追加修正）

## 調査方法

`grep -rn "process.env." voice-pipeline/src/` の実行結果を整理。

## 検出された環境変数一覧

| 変数名 | 参照ファイル:行 | デフォルト値 | 必須 | 用途 |
|--------|---------------|-------------|------|------|
| `VOICE_PIPELINE_API_BASE_URL` | discord-api.ts:3 | `""` | Yes (Bot用) | Discord Bot → API の接続先URL |
| `INGEST_API_KEY` | discord-api.ts:4, server.ts:13 | `""` | No | API Bearer 認証キー |
| `DISCORD_BOT_TOKEN` | discord-bot.ts:5, discord-register.ts:4 | なし | Yes (Bot用) | Discord Bot ログイン |
| `DISCORD_APPLICATION_ID` | discord-register.ts:5 | なし | Yes (登録用) | slash command 登録 |
| `DISCORD_GUILD_ID` | discord-register.ts:6 | なし | No | guild command 登録（未指定時 global） |
| `GITHUB_TOKEN` | github-store.ts:5, pipeline.ts:14 | なし | Yes | GitHub Contents API 認証 |
| `GITHUB_REPO` | github-store.ts:6, pipeline.ts:15 | なし | Yes | 対象リポジトリ (owner/repo) |
| `GITHUB_BRANCH` | github-store.ts:7, pipeline.ts:16 | `"main"` | No | Vault 書き込みブランチ |
| `GITHUB_VAULT_PATH` | pipeline.ts:17, worker.ts:89,137,344 | `""` | No | リポジトリ内 Vault ディレクトリ |
| `OPENAI_API_KEY` | pipeline.ts:12 | なし | Yes (ingest用) | OpenAI Whisper 文字起こし |
| `ANTHROPIC_API_KEY` | pipeline.ts:13 | なし | Yes (ingest用) | Claude 整形・分類 |
| `NOTIFY_WEBHOOK_URL` | pipeline.ts:18 | なし | No | Discord/Slack 通知 webhook |
| `NOTIFY_PROVIDER` | pipeline.ts:19 | `"slack"` | No | 通知先種別 |
| `OPENAI_TRANSCRIBE_MODEL` | pipeline.ts:20 | `"whisper-1"` | No | 文字起こしモデル |
| `ANTHROPIC_MODEL` | pipeline.ts:21 | `"claude-sonnet-4-20250514"` | No | Claude モデル |
| `PORT` | server.ts:12 | `"3456"` | No | API サーバーポート |
| `WORKER_POLL_INTERVAL_MS` | worker.ts:541 | `"60000"` | No | worker ポーリング間隔 |
| `WORKER_LOG_NO_JOB` | worker.ts:542 | `"false"` | No | no_job 時のログ出力 |

**合計: 18 変数**

## GitHub 関連変数の実態

- **トークン変数名**: `GITHUB_TOKEN` (github-store.ts:5, pipeline.ts:14)
- **リポジトリ指定**: `GITHUB_REPO` — `owner/repo` 形式の単一変数 (github-store.ts:6)
- **ブランチ指定**: `GITHUB_BRANCH` — デフォルト `"main"` (github-store.ts:7)
- **Vault パス指定**: `GITHUB_VAULT_PATH` — デフォルト `""` (pipeline.ts:17, worker.ts 複数箇所)

## routine-worker での採用方針

- 既存 worker と同じ変数名を使用（共通化）
- GitHub 系 4 変数: `GITHUB_TOKEN`, `GITHUB_REPO`, `GITHUB_BRANCH`, `GITHUB_VAULT_PATH`
- 追加で必要な変数:
  - `SUPABASE_URL` — job_locks 排他制御用（v3 新規）
  - `SUPABASE_ANON_KEY` — 将来用（v3 新規）
  - `SUPABASE_SERVICE_ROLE_KEY` — 実際の DB アクセス用（v3 新規）
  - `ANTHROPIC_API_KEY` — Claude Code CLI 用（専用キーを発行）
- routine-worker では**不要**な変数:
  - `OPENAI_API_KEY` — 音声文字起こし用、routine では不使用
  - `NOTIFY_WEBHOOK_URL` / `NOTIFY_PROVIDER` — 通知は朝サマリーで別途実装
  - `DISCORD_BOT_TOKEN` / `DISCORD_APPLICATION_ID` / `DISCORD_GUILD_ID` — Bot 専用
  - `VOICE_PIPELINE_API_BASE_URL` / `INGEST_API_KEY` — Bot → API 用
  - `PORT` — API サーバー用
  - `WORKER_POLL_INTERVAL_MS` / `WORKER_LOG_NO_JOB` — 既存 worker 用

## Task 2 手順書との差分

Task 2（環境変数設定手順書）で設定した変数は Supabase 3 本のみ。
GitHub 系は既存サービスに既に設定済みのため、Task 2 では扱わなかった。
routine-worker でも同じ変数名を参照する想定なので、Task 7 で既存 worker の値をコピー設定する。

## 結論

setup.md の「手順 4」に記載する環境変数は以下 8 本で確定：

1. `SUPABASE_URL` — Supabase Dashboard から
2. `SUPABASE_ANON_KEY` — Supabase Dashboard から
3. `SUPABASE_SERVICE_ROLE_KEY` — Supabase Dashboard から
4. `ANTHROPIC_API_KEY` — 専用キーを Anthropic Console で発行
5. `GITHUB_TOKEN` — 既存 worker からコピー
6. `GITHUB_REPO` — 既存 worker からコピー
7. `GITHUB_BRANCH` — 既存 worker からコピー (デフォルト: main)
8. `GITHUB_VAULT_PATH` — 既存 worker からコピー (デフォルト: 空文字)
