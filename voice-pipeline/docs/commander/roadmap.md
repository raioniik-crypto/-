---
type: project-roadmap
project: スマホ司令塔
version: v3.2-design
created: 2026-04-18
updated: 2026-04-18
owner: いさむ
統括: Claude（会話スレ）
status: 設計フェーズ（Phase 0）
---

# スマホ司令塔プロジェクト v3 ロードマップ

## 🎯 最終目標

> **寝る前に複数の実装指示を投げると、朝にまとまった成果物が届いている状態**

Discord 経由でスマホから命令 → クラウド側で自動実行 → Vault に保存 → 朝まとめて報告。
人間の「5分おき確認」ループを根絶し、**睡眠時間を成果物生成時間に変換**する。

---

## 💰 プロジェクト方針

### 資金方針
**品質・安定性優先**。必要なインフラ・サービスへの投資を惜しまない。
「動くけど危うい」より「堅牢で長期運用可能」を選ぶ。

### インフラ予算見込み（月額）
- Render Web Service (Standard): $25
- Render Background Worker × 3 (Standard): $75
- Supabase (Pro): $25
- Anthropic API (Claude MAX 既存): 既存
- OpenAI API (Codex レビュー用): 従量
- **合計見込み: 月額 $125〜$200**

---

## 📐 技術アーキテクチャ（v3.2 確定版）

### v2 実状況を踏まえた再設計

Claude Code への現状確認（2026-04-18）により以下が判明：

- **既存 storage**: Supabase 未使用、GitHub Contents API のみ
- **既存 worker**: `tsx src/worker.ts --loop`、60秒ポーリング
- **job ledger**: GitHub private repo 内 `system/jobs/{status}/{job_id}.json`
- **Node.js**: v22.22.2、Docker 未使用（Render Native Runtime）
- **検証系**: build/test/lint 未設定（`tsx` 直接実行）
- **現行ブランチ**: `claude/voice-obsidian-automation-EquDg`
- **最新コミット**: `10f9db9 fix: instagram_caption now generates natural captions`

### v3 での変更方針

#### A. 既存の資産はできる限り維持
- job ledger は GitHub Contents API を継続使用（`system/jobs/`配下）
- Discord Bot stateless 方針を維持
- 既存 8 コマンド（`/memo` 他）は挙動変更なし
- 既存 5 job type は挙動変更なし

#### B. 新規要素は別レイヤーで追加
- 排他制御は **Supabase 新規導入**（`job_locks` テーブルのみ、既存 ledger は GitHub 継続）
- Claude Code 実行環境は **専用 Docker イメージ**で隔離
- Routine 実行用 worker は既存 worker と分離（衝突回避）

#### C. Gemini 調査 2 回分を全面反映
1. Claude Code CLI + `--non-interactive` モードを中核
2. job type = Routines として実装
3. Skills でいさむ固有資産を注入
4. Docker イメージ事前ビルドで高速化
5. PR 自動生成を全実装系 Routine の必須フローに
6. Git Worktree で並列衝突回避
7. TTL 付き API キー管理
8. Codex レビューは全完了 job の自動フック

### 全体構成図（v3.2 確定版）

```
スマホ
  ↓ Discord
Discord Bot (既存・stateless 維持)
  ↓ API 経由（既存 voice-pipeline-api）
Render Web Service: voice-pipeline-api
  ↓ job 記録 → GitHub Contents API (既存 job ledger)
  ↓ ロック取得 → Supabase job_locks テーブル (v3 新規)
  ↓
既存 voice-pipeline-worker
  → memo_capture/dev_brief/content_draft/x_post/instagram_caption を処理
  → Node.js Native、変更なし

新規 voice-pipeline-routine-worker (v3)
  → Docker イメージ（Claude Code プリインストール）
  → Routines (code_review/spec_to_design/test_generation/claude_implementation) を処理
  → Claude Code --non-interactive で起動
  → Git Worktree で独立作業空間
  → Skills で固有知識注入
  → 完了 → Codex レビュー (OpenAI API)
  → PR 自動作成
  ↓ 結果を Vault に保存（GitHub 経由）
Obsidian Git pull
  ↓
朝サマリー → Discord 配信
```

---

## 🗺️ フェーズ分割（6 フェーズ + 最終統合）

### Phase 0: 設計フェーズ（今ここ）
**期間**: 本日中
**成果物**:
- roadmap.md（本ファイル）
- current_status.md
- rules/_common.md
- rules/code_review.md
- 朝サマリーフォーマット雛形
- Claude Code 用初期指示書
- handover ファイル（次スレッド用）

**完了条件**: 全ファイルをいさむが承認、docs/commander/ に配置完了

---

### Phase 1: 低リスク Routine で自動化パイプライン確立
**期間**: 3〜5 日
**目的**: `code_review` を最初の Routine として完走させ、パイプラインの骨格を固める

**新規実装**:
- 専用 Docker イメージ（Claude Code + Node.js v22 + git）
- Render 新規 Background Worker: `voice-pipeline-routine-worker`
- Supabase 新規プロジェクト + `job_locks` テーブル
- `voice-pipeline-api` に Routine 対応エンドポイント追加
  - `POST /routines` - Routine 起動
  - `GET /routines/:id` - Routine 状態取得
- `rules/code_review.md` に従った Routine 登録
- 排他制御ロジック（Supabase）
- `[BLOCKER_DETECTED]` STDOUT キャッチャー
- Vault への結果保存フロー（既存 GitHub 経由）
- Discord コマンド拡張: `/routine code_review <args>`

**完了条件**: 任意の GitHub リポジトリを指定して `/routine code_review` を投げ、朝サマリーに結果が届く

---

### Phase 2: 中リスク Routine 2 種で育てる
**期間**: 1 週間
**目的**: `spec_to_design` と `test_generation` を実装し、rules の書き方・検証フレームを確立

**新規実装**:
- `spec_to_design` Routine（awesome-design.md 活用）
- `test_generation` Routine（Playwright CLI 活用）
- `rules/spec_to_design.md`
- `rules/test_generation.md`
- いさむ固有 Skills 初期版（philosophy-dictionary, prompt-rules-v11, claude-management-v10）

**完了条件**: DOG POOL LP または aimo の実案件に対して投入し、使える品質の成果物が届く

---

### Phase 3: claude_implementation Routine 本体
**期間**: 1〜2 週間
**目的**: 本丸の実装 Routine を完走させる

**新規実装**:
- `rules/claude_implementation.md`
- Git Worktree 分離ロジック
- Branch 作成 → commit → push → PR 自動作成
- Codex レビューフック（`review_worker.js`）
- Skills 追加版（aimo-design-system, dog-pool-brand, supabase-inspector）

**完了条件**: 小規模な実装依頼を完走 → PR が立つ

---

### Phase 4: batch / nightly_batch 親 Routine
**期間**: 1 週間
**目的**: 複数 Routine の並列処理と時間予算管理

**完了条件**: 寝る前に 2 件投入 → 朝に両方完走している

---

### Phase 5: AutoResearch 思想の組み込み
**期間**: 継続
**目的**: rules/*.md の自己改善ループ

---

### Phase 6: arscontexta による Vault 統合
**期間**: Phase 5 と並行
**目的**: 朝サマリー・成果物をナレッジグラフ化

---

## 📅 スケジュール見込み

| Phase | 見込み期間 | 新スレッド | 備考 |
|---|---|---|---|
| 0 | 本日 | - | 設計のみ |
| 1 | 3〜5 日 | ✅ 新スレ | Docker + Supabase + 最小 Routine |
| 2 | 1 週間 | ✅ 新スレ | Routine 2 種 + Skills 初期 |
| 3 | 1〜2 週間 | ✅ 新スレ | 本丸 + PR 自動生成 |
| 4 | 1 週間 | ✅ 新スレ | 並列化 |
| 5 | 継続 | ✅ 新スレ | 自動改善 |
| 6 | Phase 5 と並行 | ✅ 新スレ | 別動画待ち |

---

## 🚨 重大リスクと対策

### R1: merge conflict（並列実行時）
Git Worktree で各 Routine に独立作業空間 / scope 必須化 / Supabase job_locks で待機

### R2: 夜間バッチの暴走
max_duration 30min / max_commits 5 / batch_token_budget 上限 / TTL 付き API キー

### R3: セキュリティ
.env・認証キー・顧客データは絶対投入禁止 / Docker ブラックリスト / PR 経由 / 学習設定オフ

### R4: トークン消費爆発
NotebookLM CLI で事前要約 / AutoResearch で可視化 / batch_token_budget

### R5: --dangerously-allow-all-changes の事故
Git Worktree で物理分離 / scope 外事前フィルタ / PR レビュー / 禁止パス事前ブロック

### R6: 既存 worker との干渉
Routine 用 worker は独立インスタンス / 既存 5 job type は既存 worker / GitHub ledger と Supabase job_locks は責務分離 / Phase 1 完走まで既存 worker を一切触らない

---

## 🎭 AI 役割分担

| AI | 役割 | 担当 | 状態 |
|---|---|---|---|
| Claude（会話スレ）| AI 統括設計責任者 | 設計・判断・他AI交通整理 | 稼働中 |
| Claude Code | 実装者（Routine 実行） | コード記述・Git操作 | Phase 1 開始時 |
| ChatGPT Thinking | 壁打ち・設計検証 + 哲学/人物記憶 | 設計レビュー・哲学整合性 | 2026-04-18 正式稼働 |
| Gemini | リサーチ・動画解析 | 技術調査・外部情報収集 | 2026-04-18 正式稼働 |
| Codex (OpenAI API) | 敵対的レビュー | 完了 Routine の diff 批判 | Phase 3 で起動 |

**いさむの対話窓口は Claude のみ**。他 AI への指示は Claude がプロンプト付きで生成する。

---

## 🧩 Skills 設計

| Skill 名 | 内容 | 活用場面 | 実装 Phase |
|---|---|---|---|
| prompt-rules-v11 | プロンプト作成絶対規約 v1.1 | 全 Routine 共通 | Phase 2 |
| claude-management-v10 | Claude 統括運用マニュアル v1.0 | 全 Routine 共通 | Phase 2 |
| philosophy-dictionary | 存報主義・黎明循環論・現戒九単 | 哲学書籍系 | Phase 2 |
| aimo-design-system | aimo のフィル性格パラメータ | aimo 関連 | Phase 3 |
| dog-pool-brand | DOG POOL YAKUZEN CUBE | DOG POOL 関連 | Phase 3 |
| supabase-inspector | Supabase CLI ラッパー | DB 関連 | Phase 3 |

---

## 🎯 マネタイズとの接続

1. **夜間バッチ統括運用ノウハウ** → Brain / Tips 販売
2. **rules/*.md 群** → PromptBase 出品
3. **受注速度 3 倍化** → クライアント案件
4. **X 発信ネタ無限** → 毎朝の朝サマリーが発信素材
5. **Skills パッケージ** → 哲学系・日本市場特化セット販売

---

## 📝 運用メモ

- 全ドキュメントは日本語（コード・コマンド・変数名・ファイル名は英語）
- スレッド移行時は `docs/commander/_handover/` の最新ファイルを起点に
- いさむの作業は「承認」「起動」「人間判断事項の回答」に限定
- 設計・執筆・引き継ぎ・他AI指示書作成は全て Claude が担当
- 他 AI への指示は必ず「コピペ可能なプロンプト」として提供

---

## 📜 変更履歴

- v3.0 (2026-04-18): 初版
- v3.1 (2026-04-18): Gemini 追加調査 4 項目を反映
- v3.2 (2026-04-18): Claude Code 現状確認を反映、docs/commander/ 配下に統合
