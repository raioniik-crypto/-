---
type: routine-rules
routine: code_review
scope: routine_specific
version: 1.0
created: 2026-04-18
inherits: _common.md v1.1
phase: Phase 1
---

# Routine: code_review

> **既存の `_common.md` に追加される形で適用される。**
> 矛盾がある場合は `_common.md` が優先される。

---

## 🎯 Routine の目的

指定された GitHub リポジトリのブランチ・PR・コミット範囲を読み、
**コードレビューコメントを生成して Vault に保存する**。

**コード自体を書き換えることは絶対にしない**。読むだけの Routine。

---

## 🗂️ 入力仕様

### 必須引数
- `repo`: GitHub リポジトリ URL または `owner/repo` 形式
- `target`: レビュー対象（以下のいずれか）
  - `branch:{branch_name}` - 特定ブランチ全体
  - `pr:{pr_number}` - 特定 PR
  - `commit:{sha}` - 特定コミット
  - `diff:{base}...{head}` - 差分範囲

### 任意引数
- `focus`: 重点観点（デフォルト: `general`）
  - `security` - セキュリティ特化
  - `performance` - パフォーマンス特化
  - `readability` - 可読性・保守性特化
  - `architecture` - 設計・アーキテクチャ特化
  - `general` - 総合（デフォルト）
- `depth`: レビューの深さ（デフォルト: `standard`）
  - `light` - 表面的なチェック（10-30 分）
  - `standard` - 標準レビュー（30-60 分）
  - `deep` - 深掘り（60-90 分）
- `language_hints`: 言語特化のヒント（例: `typescript,react`）

### 入力例

```json
{
  "routine": "code_review",
  "repo": "raioniik-crypto/aimo",
  "target": "branch:feature/phil-personality",
  "focus": "architecture",
  "depth": "standard"
}
```

---

## 🔐 Routine 固有の scope

### 読み込み許可
- 対象 repo の全ファイル（ただし `_common.md` の F1 禁止ファイルは除く）
- `.git/` 配下のメタ情報（commit log, diff）
- `README.md`, `package.json`, `tsconfig.json` 等の設定ファイル

### 書き込み許可
- **なし**（読むだけ Routine）

### 書き込み禁止
- リポジトリ内のすべてのファイル
- PR コメント欄への直接書き込み（レビュー結果は Vault に保存、PR コメントは人間が転記）

**F7 関連の注意**: `voice-pipeline` リポジトリを対象にする場合、既存コードを読むことは可能だが、どのファイルも変更してはならない。

---

## 🎬 実行フロー

### Step 1: 初期検証
1. `repo` と `target` の形式チェック
2. リポジトリのクローン（shallow clone 推奨：`--depth 50`）
3. `target` の存在確認
4. 失敗したら `[BLOCKER_DETECTED]` で停止

### Step 2: コンテキスト収集
1. `README.md` を読む（プロジェクト概要の把握）
2. `package.json` 等で依存関係・言語・フレームワークを把握
3. `target` で指定された範囲の差分を取得
4. 差分内で変更されたファイルの全体を読む（コンテキスト理解のため）

### Step 3: レビュー実施
`focus` と `depth` に応じて、以下の観点で分析：

#### 🔒 security（セキュリティ特化時に重点、general でも基本チェック）
- SQL injection / XSS 等の脆弱性
- 認証・認可の不備
- 機密情報のハードコード
- 安全でないライブラリ使用
- CORS/CSP 設定の不備

#### ⚡ performance（performance 特化時に重点）
- N+1 クエリ
- 不必要な再計算・再レンダー
- メモリリーク可能性
- 大量データ処理時のボトルネック

#### 📖 readability（readability 特化時に重点、general でも基本チェック）
- 命名の一貫性
- コメントの過不足
- 関数の長さ・責務の単一性
- マジックナンバー・マジックストリング

#### 🏗️ architecture（architecture 特化時に重点）
- レイヤー分離の適切性
- 依存方向の健全性
- 拡張性・保守性
- テスタビリティ

#### 🎯 general（デフォルト、全観点を中程度で）
- 上記すべてを標準レベルでチェック

### Step 4: 重要度分類
発見した指摘を以下に分類：

- 🔴 **Critical**: 本番で障害・脆弱性を引き起こす可能性
- 🟠 **High**: 将来的に大きな問題になる設計・実装
- 🟡 **Medium**: 改善推奨だが緊急ではない
- 🟢 **Low**: スタイル・好みの範疇
- 💡 **Suggestion**: 代替案の提案

### Step 5: レビュードキュメント生成
後述のテンプレートに従って Markdown 生成。

### Step 6: Vault 保存
`vault/03_開発/Code Reviews/{YYYY-MM-DD}_code-review_{short_title}.md` に保存。

### Step 7: 完了報告
`_common.md` の完了報告フォーマットで STDOUT 出力。

---

## 📄 レビュードキュメントのテンプレート

```markdown
---
type: code-review
routine: code_review
job_id: {job_id}
created: {YYYY-MM-DD HH:mm}
completed: {YYYY-MM-DD HH:mm}
repo: {repo}
target: {target}
focus: {focus}
depth: {depth}
reviewer: Claude Code via code_review Routine
tags: [スマホ司令塔, code_review, {focus}]
---

# コードレビュー: {short_title}

## 📋 レビュー概要

- **対象**: `{repo}` / `{target}`
- **観点**: {focus}
- **深さ**: {depth}
- **レビュー日時**: {timestamp}
- **実行時間**: {duration}

## 📊 サマリー

| 重要度 | 件数 |
|---|---|
| 🔴 Critical | {n} |
| 🟠 High | {n} |
| 🟡 Medium | {n} |
| 🟢 Low | {n} |
| 💡 Suggestion | {n} |

## 🎯 全体評価

{3〜5行で対象全体の総評}

## 🔴 Critical な指摘

### C1. {タイトル}
- **場所**: `path/to/file.ts:42-58`
- **問題**: {何が問題か}
- **影響**: {どういう悪影響があるか}
- **推奨対応**: {具体的な修正案}
- **コード例**:
  ```typescript
  // Before
  ...
  // After
  ...
  ```

### C2. {同じ形式}

## 🟠 High の指摘

### H1. {同じ形式}

## 🟡 Medium の指摘

（箇条書きで簡潔に）

- M1. `file.ts:23` - {1行で問題}
- M2. `file.ts:67` - {1行で問題}

## 🟢 Low の指摘

（箇条書きで超簡潔に）

- L1. スタイル系の細かい指摘
- L2. ...

## 💡 改善提案

### S1. {タイトル}
- **現状**: {現在の設計・実装}
- **提案**: {代替案}
- **メリット・デメリット**: {トレードオフ}

## ✨ 良かった点

（褒めポイントも必ず含める）

- 📌 {良い点1}
- 📌 {良い点2}

## 🧭 朝に確認すべきポイント (human_check_points)

- [ ] Critical 項目 {n} 件の対応方針を決める
- [ ] {具体的に人間の判断が必要な点}

## 🔗 関連ファイル

- {repo} のコードベース
- 関連 PR: {pr_url or N/A}
```

---

## 🚫 この Routine 固有の禁止事項

### CR-F1: レビュー結果の PR 直接投稿
- GitHub PR コメント欄への書き込みは禁止
- レビュー結果は Vault に保存するのみ
- PR への転記は人間が行う

### CR-F2: ファイル変更
- コード修正は絶対に行わない
- 「タイポを直しました」も禁止
- 修正が必要と感じたら、レビューコメントに書くだけ

### CR-F3: 推測による指摘
- 「たぶんこうだと思う」系の指摘は禁止
- コードから確実に読み取れる事実のみ指摘
- 不確実な場合は「要確認」として分類し、根拠を明示

### CR-F4: 大量の重箱の隅
- 1 ファイルに 20 件以上の指摘は濫発とみなす
- 本当に重要なものに絞る
- スタイル系の指摘は `prettier` / `eslint` で検出可能なものは省略推奨

---

## 🛑 この Routine 固有のブロッカー

### CR-B1: リポジトリアクセス失敗
- private repo でアクセス権限がない
- リポジトリが存在しない・削除されている
- → `[BLOCKER_DETECTED]` + `required_action: リポジトリ URL とアクセス権限の確認`

### CR-B2: target の特定不能
- 指定されたブランチ・PR・コミットが存在しない
- → `[BLOCKER_DETECTED]` + `required_action: target 引数の確認`

### CR-B3: 対象範囲が大きすぎる
- diff が 5000 行を超える
- 変更ファイルが 50 件を超える
- → `[BLOCKER_DETECTED]` + `required_action: target を絞るか depth: light での再投入`

### CR-B4: 言語・フレームワーク不明
- 読めない言語のコード（例: Rust/Go/Kotlin 等で、language_hints がない場合）
- → 自動的に `depth: light` に下げて続行（ブロッカーではないが警告）

---

## 🎛️ Routine 固有の予算

### 上限（_common.md のデフォルトより厳しく）
- `max_duration`: 60min（`depth: deep` なら 90min）
- `max_commits`: 0（書き込みなし）
- `max_files_changed`: 0（書き込みなし）

### トークン見積もり
- `depth: light`: 約 30k〜80k tokens
- `depth: standard`: 約 80k〜200k tokens
- `depth: deep`: 約 200k〜500k tokens

大量トークン消費が見込まれる場合（diff > 2000 行）、NotebookLM CLI で事前要約してから投入することを検討。

---

## 📈 この Routine のメトリクス（Phase 5 用）

Phase 5 で自動改善に使う指標：

- **精度**: 人間レビューで「無効」と判定された指摘の割合
- **網羅性**: 人間レビューで「見落とし」と判定された件数
- **重要度分類精度**: Critical/High の判定が人間と一致した割合
- **実行時間**: depth 別の平均実行時間
- **トークン効率**: 1 行あたりの消費トークン

記録形式：各レビュー完了時に `vault/03_開発/Code Reviews/_metrics/` 配下に JSON で保存。

---

## 🧪 Phase 1 での動作確認手順

### テスト 1: 自分のプロジェクトを対象に
```json
{
  "routine": "code_review",
  "repo": "raioniik-crypto/-",
  "target": "branch:claude/voice-obsidian-automation-EquDg",
  "focus": "general",
  "depth": "light"
}
```

期待される結果：
- 30 分以内に完走
- `vault/03_開発/Code Reviews/2026-04-XX_code-review_voice-pipeline.md` が生成される
- Discord に完了通知

### テスト 2: 外部リポジトリ（Public）
```json
{
  "routine": "code_review",
  "repo": "anthropics/claude-code-examples",
  "target": "branch:main",
  "focus": "readability",
  "depth": "light"
}
```

期待される結果：
- アクセス成功
- 読みやすさ重点のレビュー生成

### テスト 3: Phase 2-3 で使う aimo リポジトリ
```json
{
  "routine": "code_review",
  "repo": "raioniik-crypto/TA.isamu",
  "target": "branch:main",
  "focus": "architecture",
  "depth": "standard"
}
```

---

## 📝 いさむへの確認事項（Phase 1 セットアップ時）

Phase 1 開始時に以下を決める：

- [ ] この Routine をトリガーする Discord コマンドの形（`/routine code_review <args>` で良いか）
- [ ] レビュー対象リポジトリのリスト（最初のテストでどれを使うか）
- [ ] `human_check_points` の朝の通知方法（Discord Embed / DM / メンション）

---

## 📜 変更履歴

- v1.0 (2026-04-18): 初版
