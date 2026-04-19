---
type: routine-rules
scope: _common
version: 1.1
created: 2026-04-18
updated: 2026-04-18
applies_to: 全 Routine
priority: highest
---

# 全 Routine 共通ルール

> **このファイルは全ての Routine 実行時に最優先で読み込まれる。**
> 個別 Routine（`code_review.md` 等）のルールはこれに追加される形で適用される。
> 矛盾がある場合は本ファイルが優先される。

---

## 🎯 最上位原則

### 原則 1: 自律的に進める
- 軽微な判断は独自に下し、途中確認を人間に投げない
- 「これでいいですか？」と聞かない
- 明確な指示がなくとも、本ルールと Routine 固有ルールに基づいて判断する

### 原則 2: ブロッカー時のみ停止する
- 停止判断は以下の条件に限定する（詳細は後述）
- 停止時は必ず `[BLOCKER_DETECTED]` を STDOUT に出力
- 停止後は一切の作業を行わない

### 原則 3: 固定フォーマットで報告する
- 完了時・ブロック時・失敗時、すべて後述の「報告フォーマット」に従う
- フォーマットを勝手に拡張・省略しない

### 原則 4: スコープ外を触らない
- 各 Routine に定義された `scope` 外のファイルを絶対に変更しない
- 読むだけなら許可されるが、書き込み・削除は禁止
- スコープ外への変更が必要と判断した場合は、ブロッカーとして停止する

### 原則 5: 既存成功導線を壊さない
- v2 で動作している以下のコマンドの挙動を絶対に変えない:
  - `/memo`, `/job`, `/status`, `/recent`, `/jobs`, `/retry`, `/help`, `/artifact`
- 既存の保存先ルールを維持（`memo_capture` → `vault/Inbox/` 等）
- 既存の job type（`memo_capture`, `dev_brief`, `content_draft`, `x_post`, `instagram_caption`）の挙動を変更しない
- **既存 worker（`voice-pipeline-worker`）のコードを触らない**
  - Routine は独立した `voice-pipeline-routine-worker` が処理する
  - 既存 `src/worker.ts`, `src/jobs.ts`, `src/server.ts` の改修は明示指示がない限り禁止

---

## 🚫 絶対禁止事項

以下を検知した場合、即座にブロッカーとして停止する：

### F1: 禁止ファイルへの接触
以下のファイル・ディレクトリは**読み込み・書き込みともに禁止**：
- `.env`, `.env.*` （環境変数ファイル）
- `credentials.json`, `token.json` 等の認証ファイル
- `*.pem`, `*.key`, `*.p12` 等の秘密鍵
- `~/.ssh/` 配下
- `~/.aws/`, `~/.gcloud/` 配下
- クライアント個人情報を含むファイル（顧客名 CSV、メール本文等）

### F2: 顧客データ・個人情報の外部送信
- API リクエストや外部ログに顧客の氏名・連絡先・住所を含めない
- いさむ自身の個人情報は必要に応じて送信可（判断が付かない場合はブロック）

### F3: main ブランチへの直接 push
- すべての変更は `claude/` プレフィックスのブランチ経由
- `main`, `master`, `develop`, `production` 等の主要ブランチへの直接 push 禁止

### F4: 大規模リファクタリング
- 指示されていないリファクタリングは禁止
- 「ついでに綺麗にしておく」は禁止
- ファイル構造の変更・フォルダ移動は明示指示がない限り禁止

### F5: 依存関係の勝手な変更
- `package.json`, `requirements.txt`, `Cargo.toml` 等の依存関係ファイルは、明示指示なく変更禁止
- 新規依存追加が必要な場合はブロッカーとして停止

### F6: ユーザー承認バイパスの濫用
- `--dangerously-allow-all-changes` フラグは Worker 側で制御される
- Routine 内部でこのフラグを過信した破壊的操作（`rm -rf`, `DROP TABLE` 等）を行わない

### F7: 既存インフラへの接触
- 既存の `voice-pipeline-api` および `voice-pipeline-worker` のコード改修禁止
- `voice-pipeline-discord-bot` の改修は Discord コマンド追加以外禁止
- GitHub job ledger（`system/jobs/` 配下）の構造変更禁止
- Routine 関連は新規 `voice-pipeline-routine-worker` 内でのみ実装

---

## 🛑 ブロッカー検知条件

以下の状況に該当した場合、`[BLOCKER_DETECTED]` を出力して停止：

### B1: 外部情報が必要
- API ドキュメントの参照が必要で、手元のコンテキストに情報がない
- クライアント仕様の確認が必要

### B2: 制約の矛盾
- Routine のルールと指示内容が矛盾する
- scope の定義と実際に触る必要のあるファイルが食い違う

### B3: セキュリティリスクの検知
- 禁止ファイル（F1）への接触を求められた
- 個人情報の外部送信が必要な状況

### B4: 判断に自信が持てない
- 複数の実装方針があり、どちらが正しいか判断不能
- 「どちらでもいい」と判断できるもの以外

### B5: 依存関係の新規追加が必要
- F5 に該当

### B6: タイムアウト接近
- `max_duration` の 80% を超過した時点で、安全に中断する
- 未完了でもそれまでの成果を保存

### B7: 既存インフラの改修要求
- F7 に抵触する指示があった場合
- 「ついでに既存 worker も直しておく」系の拡大要求

---

## 📋 ブロッカー報告フォーマット

```
[BLOCKER_DETECTED]
routine: {routine_name}
job_id: {job_id}
blocker_type: {F1-F7 または B1-B7 のいずれか}
reason: {1-2行で簡潔に}
context: {現在の作業状況を3-5行で}
required_action: {人間が何をすれば解除できるか}
partial_results:
  - {途中まで完了した成果物のパス}
  - {あれば複数}
artifacts_path: {部分成果の保存先}
```

---

## ✅ 完了報告フォーマット

```
[ROUTINE_COMPLETED]
routine: {routine_name}
job_id: {job_id}
duration: {実行時間}
tokens_used: {推定トークン数}
branch: {作成したブランチ名 or "N/A"}
commit: {最後のコミットハッシュ or "N/A"}
changed_files:
  - {ファイルパス1} (+X / -Y)
  - {ファイルパス2} (+X / -Y)
checks:
  build: {pass / fail / skipped / not_applicable}
  test: {pass / fail / skipped / not_applicable}
  lint: {pass / fail / skipped / not_applicable}
human_check_points:
  - {朝に確認すべきポイント1}
  - {朝に確認すべきポイント2}
artifacts:
  - path: {Vault 内のパス}
    summary: {1行要約}
codex_review:
  status: {done / skipped}
  critical_findings: {件数}
  summary: {3行以内}
pr_url: {PR の URL or "N/A"}
```

---

## ❌ 失敗報告フォーマット

```
[ROUTINE_FAILED]
routine: {routine_name}
job_id: {job_id}
duration: {実行時間}
error_type: {ビルド失敗 / テスト失敗 / 予期せぬエラー / 等}
error_message: {エラー本文 or スタックトレース要約}
reproduction_steps:
  - {再現手順1}
  - {再現手順2}
attempted_fixes:
  - {試みた修正1: 結果}
  - {試みた修正2: 結果}
current_state:
  branch: {現在のブランチ}
  uncommitted_changes: {yes/no}
rollback_needed: {yes/no}
artifacts_path: {ログ等の保存先}
```

---

## 🔒 検証の実行ルール

### 検証の実施判断

Routine 完了前の検証（build/test/lint）は **対象プロジェクトに応じて柔軟に判断する**：

#### ケース A: 検証コマンドが存在するプロジェクト
`package.json` の `scripts` に `build`, `test`, `lint` 等が定義されているプロジェクト：

1. **build**: 定義されたビルドコマンド実行
2. **test**: 定義されたテストコマンド実行
3. **lint**: 定義された lint コマンド実行

各ステータスを `pass / fail / skipped` で報告。

#### ケース B: 検証コマンドが存在しないプロジェクト
`voice-pipeline` 本体など、build/test/lint が未定義のプロジェクト：

- 報告時のステータスは `not_applicable`
- 構文チェックとして代替実行可能:
  - TypeScript: `tsx --test` または `node --check`
  - Node.js: `node --check`
  - Python: `python -m py_compile`
- 代替実行した場合は `pass / fail` で報告し、`note: tsx --test で代替検証` 等を付記

#### ケース C: 検証コマンドの特定方法

プロジェクトに入った際、以下の順で検証コマンドを特定：

1. `package.json` の `scripts` セクションを確認
2. `README.md` の「Testing」「Build」「Development」セクションを確認
3. `Makefile`, `justfile` のターゲットを確認
4. どれも見つからない → ケース B として扱う

### 検証失敗時の対応

- 簡単に修正可能（明らかな typo、import 漏れ等）→ 自律的に修正して再実行
- 複雑な失敗 → ブロッカーまたは失敗として報告
- 修正試行は最大 3 回まで（それ以上は失敗報告）

### Routine 別の検証ポリシー

- `code_review`: コード読むだけなので検証スキップ（`not_applicable`）
- `spec_to_design`: 設計ドキュメント生成のみ、検証スキップ
- `test_generation`: 生成したテストの実行可能性を検証
- `claude_implementation`: **検証必須**、失敗時はブロッカー

---

## 🌳 Git 運用ルール

### ブランチ命名
- 形式: `claude/{routine_name}-{job_id_short}-{slug}`
- 例: `claude/code-review-abc123-auth-module`
- `slug` は作業内容を3-5単語で表現した英小文字ハイフン区切り

### コミットメッセージ
- 形式: Conventional Commits
- prefix: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- 1行目は50文字以内、本文は72文字で改行
- 例: `feat(code-review): add adversarial check for auth flow`

### コミット頻度
- 論理的な作業単位ごとに commit
- 1 Routine 内で `max_commits_per_routine` を超えないこと（デフォルト 5）
- 超えそうな場合はブロッカー

### Git committer
- name: `Claude AI bot`
- email: `bot@isamu-commander`

### Worktree の扱い
- 各 Routine は独立した Worktree 内で作業
- Worktree のパスは Worker 側が指定する `CLAUDE_WORKTREE_PATH` 環境変数で渡される
- Worktree 外のファイル操作は禁止

---

## 📁 Vault 保存ルール

### 既存 job type の保存先（変更禁止）
- `memo_capture` → `vault/Inbox/`
- `dev_brief` → `vault/03_開発/Dev Briefs/`
- `content_draft` → `vault/02_ライティング/Content Drafts/`
- `x_post` → `vault/02_ライティング/X Posts/`
- `instagram_caption` → `vault/02_ライティング/Instagram Captions/`

### 新規 Routine の保存先
- `code_review` → `vault/03_開発/Code Reviews/`
- `spec_to_design` → `vault/03_開発/Design Specs/`
- `test_generation` → `vault/03_開発/Test Artifacts/`
- `claude_implementation` → `vault/03_開発/Implementations/`
- 朝サマリー → `vault/03_開発/Morning Summaries/`

### ファイル名規則
- 形式: `{YYYY-MM-DD}_{routine_name}_{short_title}.md`
- `short_title` は日本語15字以内または英語30字以内

### frontmatter 必須項目
```yaml
---
type: {artifact-type}
routine: {routine_name}
job_id: {job_id}
created: {YYYY-MM-DD}
completed: {YYYY-MM-DD HH:mm}
related_branch: {branch_name or N/A}
related_pr: {pr_url or N/A}
tags: [スマホ司令塔, {routine_name}]
---
```

---

## 🎭 AI 間連携ルール

### 他 AI への問い合わせ
Routine 実行中に他 AI への問い合わせが必要な場合：

- **基本方針**: Routine 内部では行わない
- 必要性を感じた場合はブロッカーとして停止し、人間経由で他 AI に聞く形にする
- 例外: Codex 自動レビューフック（`review_worker.js` が自動実行）

### いさむ固有情報の扱い

**以下の情報源はこのプロジェクトにおける信頼源**：

1. **いさむの哲学体系・人物面に関する情報**
   - 最新の状態を把握しているのは ChatGPT Thinking
   - Routine 実行中にこれらの情報が必要になった場合、ブロッカーとして停止
   - 人間経由で ChatGPT に問い合わせる

2. **プロジェクトの技術仕様**
   - 最新の状態を把握しているのは Claude（会話スレ）
   - `roadmap.md`, `current_status.md`, `rules/*.md` が一次情報源

3. **既存コードベースの仕様**
   - 最新の状態はリポジトリ自体が一次情報源
   - コメント、README、既存テストを参照

---

## 🛡️ Skills の使用ルール

### Skills の読み込み
- Routine は自動的に `_common` Skills（`prompt-rules-v11`, `claude-management-v10`）を読み込む
- Routine 固有の Skill（例: `aimo-design-system`）は Routine ルール内で指定

### Skills の出力への影響
- Skills は「参考情報」として扱い、絶対的な指示ではない
- Skills とルールが矛盾する場合、ルールが優先

### Skills の編集
- Routine 実行中に Skills 本体を編集することは禁止
- Skills 改善の提案は完了報告内の `improvement_suggestions` セクションで行う

---

## 💰 リソース予算

### デフォルト上限
- `max_duration: 30min` per Routine
- `max_commits: 5` per Routine
- `max_files_changed: 20` per Routine
- `max_new_files: 10` per Routine

### batch 親 Routine 配下での予算
- `batch_token_budget`: バッチ全体の上限（親 Routine で指定）
- 子 Routine はこれを超過しないよう動的に調整

### 予算接近時の挙動
- 上限の 80% 到達: 現在の作業を安全に完了させる方向へ舵を切る
- 上限の 95% 到達: 即座にブロッカーとして停止

---

## 📝 最終確認チェックリスト

Routine 完了前にすべて `yes` であること：

- [ ] scope 外ファイルを変更していない
- [ ] 禁止ファイル（F1）に触れていない
- [ ] `main` ブランチに直接 push していない
- [ ] 依存関係を勝手に変更していない
- [ ] 既存 worker のコードを改修していない（F7）
- [ ] 検証（build/test/lint）を実行または `not_applicable` と判定した
- [ ] 完了報告フォーマットに従っている
- [ ] Vault への保存パスが規則通り
- [ ] frontmatter 必須項目がすべて埋まっている
- [ ] `human_check_points` を明記した

---

## 🔄 本ファイルの更新ルール

- 本ファイルの改訂は Claude（会話スレ）のみが行う
- 改訂時は `version` をインクリメント、`updated` を記録
- 過去バージョンは `_archive/_common_v{N}.md` として保存
- Phase 5（AutoResearch 導入時）以降は、メトリクスを元に定期的に改訂

---

## 📜 変更履歴

- v1.0 (2026-04-18): 初版
- v1.1 (2026-04-18): Claude Code 現状確認を反映
  - F7（既存インフラへの接触禁止）を追加
  - B7（既存インフラの改修要求検知）を追加
  - 検証の実行ルールを「ケース A/B/C」で柔軟化
  - `not_applicable` ステータスを追加
  - Routine 別の検証ポリシーを明記
  - 最終確認チェックリストに既存 worker 非改修項目を追加
