---
type: claude-code-init-prompt
purpose: Phase 1 開始時に Claude Code に最初に渡すプロンプト
version: 1.0
created: 2026-04-18
usage: 新スレッドで Claude Code を起動し、本ファイルの「実際のプロンプト」セクション全文をコピペする
---

# Claude Code 用初期指示書（Phase 1 開始プロンプト）

## 🎯 この文書の目的

Phase 1 開始時、新しい Claude Code スレッドで**最初に投げるプロンプト**を定義する。

このプロンプトを投げると、Claude Code は：
1. プロジェクト全体を理解する
2. Phase 1 の実装タスクを把握する
3. ルール・制約を認識する
4. 最初の実装に着手する

**いさむの作業は、以下の「実際のプロンプト」セクションの内容を Claude Code にコピペするだけ**。

---

## 📋 前提条件（Phase 1 開始時にいさむが済ませること）

Claude Code を起動する前に、以下を完了しておく必要がある：

### 事前タスク 1: 設計ドキュメントが Git にある
以下がすべて `voice-pipeline/docs/commander/` 配下に配置され、GitHub に push 済み：

- [x] `roadmap.md`
- [x] `current_status.md`
- [x] `rules/_common.md`
- [x] `rules/code_review.md`
- [x] `templates/morning_summary_template.md`
- [x] `templates/claude_code_init.md`（本ファイル）
- [x] `_handover/2026-04-18_phase0-phase1.md`

### 事前タスク 2: Supabase セットアップ
1. Supabase プロジェクト作成済み: `isamu-commander-locks` ✅
2. Pro プラン契約済み ✅
3. 接続情報をメモ:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 事前タスク 3: Supabase SQL 実行（Phase 1 の最初の作業）
`job_locks` テーブル作成SQLを実行する。
- Claude Code 起動後、最初のタスクとして SQL を生成 → いさむが Supabase SQL Editor に貼って Run

### 事前タスク 4: Render ダッシュボードの準備
- 既存の Starter プランは維持（今回は格上げ不要）
- 新規 Background Worker 作成のための準備

### 事前タスク 5: リポジトリの準備
- `voice-pipeline` リポジトリが `/home/user/-/voice-pipeline/` に存在 ✅
- 現在のブランチが `claude/voice-obsidian-automation-EquDg` ✅

---

## 📨 実際のプロンプト（コピペ用）

以下のブロック全体を Claude Code にそのまま投げる：

```
# スマホ司令塔プロジェクト Phase 1 実装依頼

## あなたの役割

あなたは「スマホ司令塔プロジェクト」における実装担当者（Routine 実行者）です。
以下の指示に従い、Phase 1 の実装を完遂してください。

## 最初にやること

1. 以下のファイルをすべて読み込み、プロジェクト全体を理解してください：
   - voice-pipeline/docs/commander/roadmap.md
   - voice-pipeline/docs/commander/current_status.md
   - voice-pipeline/docs/commander/rules/_common.md
   - voice-pipeline/docs/commander/rules/code_review.md
   - voice-pipeline/docs/commander/templates/morning_summary_template.md
   - voice-pipeline/docs/commander/_handover/2026-04-18_phase0-phase1.md

2. 読み終わったら、以下の形式で応答してください：

## 理解した内容（300字以内）

[プロジェクトの全体像を要約]

## Phase 1 で実装すること（箇条書き）

- [タスク1]
- [タスク2]
...

## 把握したルール・制約（重要な3〜5点）

- [ルール1]
- [ルール2]
...

## 質問・不明点

- [あれば記載、なければ「なし」]

3. 私が「OK」と応答したら、Phase 1 の実装に着手してください。

## 行動原則

- 自律的に進める: 軽微な判断は独自に下し、途中確認を投げない
- ブロッカー時のみ停止: [BLOCKER_DETECTED] STDOUT を出力して停止
- 既存成功導線を壊さない: v2 で動作している機能に一切手を加えない
- スコープ外を触らない: 明示的に許可されたファイル・ディレクトリのみ変更

## 絶対禁止事項（再掲）

- .env、認証ファイル、秘密鍵への接触禁止
- main ブランチへの直接 push 禁止
- 既存 voice-pipeline-worker のコード改修禁止
- 勝手な大規模リファクタリング禁止
- 勝手な依存関係追加禁止

詳細は rules/_common.md の F1〜F7 を参照。

## 報告フォーマット

完了時・ブロック時・失敗時は、rules/_common.md に定義された固定フォーマットで報告してください。

## プロジェクト関連情報

- 既存リポジトリ: voice-pipeline (/home/user/-/voice-pipeline/)
- 現在のブランチ: claude/voice-obsidian-automation-EquDg
- 最新コミット: 10f9db9 fix: instagram_caption now generates natural captions
- Node.js バージョン: v22.22.2
- Supabase プロジェクト: isamu-commander-locks（事前作成済み）

## 統括者

設計判断・仕様質問は Claude（別スレッド）が担当しています。
質問は「質問・不明点」セクションに書き出してください。
私（いさむ）経由で Claude に回答を求めます。

---

準備完了したら、上記「最初にやること」を実行してください。
```

---

## 📝 このプロンプトの設計意図

### 1. 冒頭で「役割の明確化」
Claude Code に「あなたは実装担当者」と明示。設計判断は別スレッドの Claude が行うことを伝える。

### 2. 「最初にやること」で段階的読み込み
いきなり実装に入らせず、まずプロジェクト理解を確認する。理解不十分なら質問を出させる。

### 3. 「理解した内容 300 字以内」で圧縮確認
長文で要約させず、300 字の圧縮で本質理解を確認。圧縮できる＝理解できている証拠。

### 4. 「私が『OK』と応答したら着手」
着手前に、いさむ経由で「この理解で正しいか」を Claude（会話スレ）が確認できる機会を作る。

### 5. 禁止事項の再掲
rules/_common.md を読んでいても、プロンプト冒頭でも再掲する。二重の安全装置。

### 6. 「Claude に質問を投げる経路」を明示
Claude Code が迷ったら質問 → いさむ経由で別スレッドの Claude（俺）へ → 回答が返る、というフローを定型化。

---

## 🎬 Phase 1 開始時の想定フロー

### いさむがやる手順

1. **新スレッドで Claude Code を起動**
   - 作業ディレクトリ: `/home/user/-/voice-pipeline/`

2. **本ファイルの「実際のプロンプト」セクション全文をコピペ**

3. **Claude Code の応答を待つ**
   - 約 3〜5 分で理解内容の要約が返る

4. **応答をこの会話（Claude 会話スレ）にコピペして貼る**
   - 「Phase 1 のスレッド立てた、Claude Code の応答はこれ」と言って貼る

5. **Claude（会話スレ）がレビュー**
   - 理解に漏れ・誤解がないかチェック
   - 質問があれば回答を生成

6. **Claude Code に「OK、着手して」と指示**
   - ここから Claude Code が自律的に実装開始

### Claude Code がやる実装内容（Phase 1）

1. **Supabase `job_locks` テーブルのスキーマ SQL 生成**
   - いさむが Supabase SQL Editor で実行する SQL ファイル作成
   - TTL 付き排他制御の完全実装（acquire_lock, release_lock, cleanup_expired_locks, check_lock）

2. **Docker イメージの作成**
   - Dockerfile 作成（Node.js v22 + Claude Code + git）
   - ローカルでビルド・動作確認

3. **`voice-pipeline-routine-worker` の実装**
   - 新規ファイル `src/routine-worker.ts` 作成
   - `--non-interactive` モードで Claude Code を子プロセス起動
   - `[BLOCKER_DETECTED]` STDOUT パターン検知
   - Supabase 排他制御ロジック

4. **既存 API に Routine エンドポイント追加**
   - `POST /routines` - Routine 起動
   - `GET /routines/:id` - Routine 状態取得
   - 既存コードの改修は最小限に

5. **Discord Bot にコマンド追加**
   - `/routine code_review <args>` の追加
   - 既存コマンドに影響を与えない形で追加

6. **Render への新規 Worker デプロイ設定**
   - `render.yaml` または Dashboard 設定

7. **`code_review` Routine の動作確認**
   - テスト 1〜3（`rules/code_review.md` に記載）を実行

8. **朝サマリーの自動生成ロジック**
   - `templates/morning_summary_template.md` に従った生成スクリプト

9. **完了報告**
   - Phase 1 の成果物リスト
   - 動作確認結果
   - Phase 2 への引き継ぎメモ

---

## 🚨 Phase 1 でのトラブル対応方針

### ケース A: Claude Code が早期にブロックした
- ブロッカー内容を Claude（会話スレ）に共有
- Claude が解決方針を生成
- Claude Code に指示

### ケース B: Docker イメージのビルド失敗
- ローカルでの再現確認
- Gemini に Docker/Node.js の最新ベストプラクティスを調査させる
- 修正方針を Claude Code に指示

### ケース C: Supabase 接続エラー
- 接続情報（URL、キー）を確認
- Supabase 側の設定確認
- ネットワーク・環境変数の確認

### ケース D: `--non-interactive` モードが想定通り動かない
- Gemini に最新仕様を再確認依頼
- 代替案（Anthropic API 直叩き）に切り替えを検討

---

## 📜 変更履歴

- v1.0 (2026-04-18): 初版
