---
type: project-status
project: スマホ司令塔
version: v3.2
created: 2026-04-18
last_updated: 2026-04-18
current_phase: Phase 0（設計フェーズ）
updated_by: Claude（会話スレ）
---

# スマホ司令塔プロジェクト 現状

> **このファイルは毎スレッド終了時に Claude が更新する**。いさむは読むだけ。

---

## 📍 いまここ

### 現在のフェーズ
**Phase 0: 設計フェーズ**

### 進捗
- [x] Gemini 技術調査 1 回目完了
- [x] Gemini 技術調査 2 回目完了
- [x] AI 役割分担確定（ChatGPT / Gemini 正式稼働開始）
- [x] Claude Code 環境調査完了（Linux サンドボックス確認）
- [x] 配置戦略確定（voice-pipeline/docs/commander/）
- [x] ディレクトリ構造作成完了（.gitkeep 配置済）
- [x] Supabase プロジェクト作成完了
- [x] roadmap.md 投入完了
- [ ] current_status.md 投入（このファイル）
- [ ] rules/_common.md 投入
- [ ] rules/code_review.md 投入
- [ ] templates/morning_summary_template.md 投入
- [ ] templates/claude_code_init.md 投入
- [ ] _handover/2026-04-18_phase0-phase1.md 投入
- [ ] 全ファイルを1コミットにまとめて commit
- [ ] GitHub MCP 経由で push

### 次にやること
1. 残り 5 ファイルを順次 Claude Code 経由で書き込み
2. 全ファイル投入完了後、まとめて git commit
3. GitHub MCP の push_files で push
4. Phase 1 用の新スレッド立ち上げ準備

---

## 🏗️ これまでの到達点（v2 時点）

既に完成・実運用水準に達しているもの：

### 動作中のコマンド
- `/memo` - メモ保存
- `/job` - job 投入（5 種類の type に対応）
- `/status` - job 状態確認
- `/recent` - 最近の完了 job 一覧
- `/jobs` - status 指定の一覧表示
- `/retry` - failed job の再投入
- `/help` - コマンド早見表
- `/artifact` - 成果物本文の表示

### 対応済み job type（v2）
- `memo_capture` → `vault/Inbox/`
- `dev_brief` → `vault/03_開発/Dev Briefs/`
- `content_draft` → `vault/02_ライティング/Content Drafts/`
- `x_post` → `vault/02_ライティング/X Posts/`
- `instagram_caption` → `vault/02_ライティング/Instagram Captions/`

### インフラ
- Render Web Service: `voice-pipeline-api`（Starter）
- Render Background Worker: `voice-pipeline-worker`（Starter）
- Render Background Worker: `voice-pipeline-discord-bot`（Starter）
- GitHub private repo 連携
- Obsidian Git plugin pull
- 作業ブランチ: `claude/voice-obsidian-automation-EquDg`
- 最新コミット: `10f9db9 fix: instagram_caption now generates natural captions`

### 環境仕様
- Node.js: v22.22.2
- Docker: v29.3.1（利用可能）
- Linux サンドボックス: 16コア / 21GB RAM / 30GB ディスク
- 作業ディレクトリ: `/home/user/-/voice-pipeline/`

---

## 🎯 v3 で新規追加する要素

### 新規 Routine
- `code_review`（Phase 1）
- `spec_to_design`（Phase 2）
- `test_generation`（Phase 2）
- `claude_implementation`（Phase 3）
- `batch` / `nightly_batch`（Phase 4）

### 新規インフラ
- 専用 Docker イメージ（Claude Code + Node.js + git）
- Render 新規 Background Worker: `voice-pipeline-routine-worker`（Standard $25/月）
- Supabase Pro プロジェクト: `isamu-commander-locks`（$25/月）
- `job_locks` テーブル（排他制御専用）
- Git Worktree 分離機構
- `review_worker.js`（Codex 自動レビュー）
- PR 自動生成フロー

### 新規 Skills（Phase 2 以降）
- `philosophy-dictionary`
- `prompt-rules-v11`
- `claude-management-v10`
- `supabase-inspector`
- `aimo-design-system`
- `dog-pool-brand`

### 新規 Discord コマンド（予定）
- `/routine` - Routine の起動
- `/batch` - 複数 Routine の一括投入
- `/summary` - 朝サマリー強制取得
- `/skills` - 登録済み Skills 一覧

---

## 🚧 Phase 1 開始時に決めること

### 技術選択
- [ ] Dockerfile のベースイメージ（Alpine vs slim 推奨）
- [ ] Git Worktree の配置パス（`/tmp/worktrees/` 等）
- [ ] `review_worker.js` のトリガー方式

### 運用ルール
- [ ] 朝サマリーの配信時刻（デフォルト 06:00 JST で良いか）
- [ ] blocked job の再試行ポリシー
- [ ] PR レビュー担当（いさむのみ / Codex 併用）

### 予算管理
- [ ] `batch_token_budget` 初期値
- [ ] `max_duration_per_routine` 初期値（30min で良いか）

### セキュリティ
- [ ] 禁止パスリストの確定
- [ ] Claude 学習設定の最終チェック

---

## 📊 メトリクス記録（Phase 1 以降で開始）

Phase 5 で AutoResearch に使う指標：

- Routine 成功率
- `[BLOCKER_DETECTED]` 発生率
- 平均実行時間
- トークン消費量
- human_check 発生件数
- Codex レビュー指摘件数
- PR マージ率

**Phase 0-1 時点では記録なし**。Phase 1 完走時から記録開始。

---

## 🧠 関連ファイル

プロジェクト関連ファイルのパス（配置先: voice-pipeline/docs/commander/）:

```
voice-pipeline/docs/commander/
├── roadmap.md                    ← 全体地図
├── current_status.md             ← 本ファイル
├── rules/
│   ├── _common.md                ← 全 Routine 共通ルール
│   ├── code_review.md            ← Phase 1
│   ├── spec_to_design.md         ← Phase 2（未作成）
│   ├── test_generation.md        ← Phase 2（未作成）
│   └── claude_implementation.md  ← Phase 3（未作成）
├── templates/
│   ├── morning_summary_template.md  ← 朝サマリー雛形
│   └── claude_code_init.md          ← Claude Code 用初期指示書
└── _handover/
    └── 2026-04-18_phase0-phase1.md   ← 次スレッド用
```

---

## 🎭 現在のAIアサイン状況

| AI | 今の役割 | 今やっていること |
|---|---|---|
| Claude（会話スレ）| 統括 | Phase 0 のファイル群生成中 |
| Claude Code | 実装待機 | Phase 1 開始待ち |
| ChatGPT Thinking | 設計検証 | 役割宣言完了、Phase 0 レビュー待機 |
| Gemini | リサーチ | 技術調査 2 回完了、次指示待機 |
| Codex | 未起動 | Phase 3 で初投入予定 |

---

## 🗓️ 直近の重要タイムライン

- **2026-04-18**: Phase 0 開始（設計フェーズ）
- **本日中**: Phase 0 完了見込み
- **2026-04-19〜23**: Phase 1 実装見込み
- **2026-04-24〜30**: Phase 2 実装見込み
- **2026-05 上旬**: Phase 3 着手見込み

---

## 📝 今スレッドでの決定事項ログ

Phase 0 で決めたこと（後から参照用）：

- 全ドキュメント日本語、コード・コマンドは英語
- いさむの作業は「承認」「起動」「人間のみ判断事項の回答」のみ
- 他 AI への指示はすべて Claude がプロンプト付きで生成
- スレッド移行は各 Phase 完了時に必ず実施
- Claude Code `--non-interactive` を中核、API 直叩きは予備
- job type は Routines として実装
- Skills でいさむ固有資産を注入
- PR 自動生成を全実装系 Routine の必須フローに
- Git Worktree で並列衝突回避
- 既存 worker は一切触らない（F7 ルール）
- 設計ドキュメントは voice-pipeline/docs/commander/ 配下に統合
- Vault は閲覧用・成果物保存のみ、ソース of truth は Git リポジトリ

---

## ⚠️ 注意事項

- **このファイルは Claude が更新する**。いさむは読むだけ
- 手動で編集しても次スレッドで上書きされる
- 進捗変更があれば Claude に伝え、Claude が更新する
- チェックボックス `[ ]` → `[x]` は各ファイル承認時に Claude が更新
