---
type: template
name: morning_summary
version: 1.0
created: 2026-04-18
applies_to: 夜間バッチ終了時の自動生成サマリー
---

# 朝サマリーフォーマット雛形

> **このファイルは夜間バッチ完了時に生成されるサマリーのテンプレート**
> Discord 配信用（短縮版）と Vault 保存用（完全版）の 2 形式を定義する。

---

## 🎯 設計思想

### 朝の体験を最優先する

朝起きて最初に触るのはスマホ。**スマホで 30 秒で全体が把握できる**ことが最重要。
詳細は必要になったら Vault を見に行く、という 2 層構造。

### 人間の認知負荷を最小化する

- 絵文字でステータスを即座に伝える（✅ ❌ ⏸️ 🔴 🟡 🟢）
- **数字は少なく、意味のあるものだけ**
- 1 画面（スマホ縦で 1 スクロール以内）に収める
- 長い成果物の本文は貼らない、リンクだけ

### 次のアクションを明示する

- 「今すぐやるべきこと」を冒頭に
- 人間の判断が必要な箇所（`human_check_points`）を強調
- blocked / failed の場合、解除手順を具体的に示す

---

## 📱 Discord 配信用（短縮版）

### 通常パターン（全て completed）

```
🌅 朝の報告 (2026-04-18 06:00)

✅ 4/4 件完走 (22:30-05:12 / 6h42m)

━━━━━━━━━━━━━━━━━━━━━━
📋 完了 Routine
━━━━━━━━━━━━━━━━━━━━━━

1️⃣ code_review: aimo architecture
   🟠 High: 2件 / 🟡 Med: 5件
   → vault/03_開発/Code Reviews/2026-04-18_aimo.md

2️⃣ spec_to_design: DOG POOL FAQ
   🟢 完了
   → vault/03_開発/Design Specs/2026-04-18_dog-pool-faq.md

3️⃣ test_generation: aimo phil-component
   ✅ 12 tests 生成
   → branch: claude/test-gen-abc123-phil
   → PR: https://github.com/.../pull/42

4️⃣ claude_implementation: portfolio OGP fix
   ✅ 実装完了 / PR作成済
   → branch: claude/impl-def456-ogp
   → PR: https://github.com/.../pull/43

━━━━━━━━━━━━━━━━━━━━━━
🎯 今朝やること
━━━━━━━━━━━━━━━━━━━━━━

1. PR #42 と #43 の最終レビュー
2. aimo の High 指摘 2 件の対応方針決定

/summary full で完全版を表示
```

### 部分成功パターン（blocked あり）

```
🌅 朝の報告 (2026-04-18 06:00)

⚠️ 3/4 件完走 / 1件保留 (22:30-04:50 / 6h20m)

━━━━━━━━━━━━━━━━━━━━━━
✅ 完了した Routine
━━━━━━━━━━━━━━━━━━━━━━

1️⃣ code_review: aimo
   🟠 High: 2件 / 🟡 Med: 5件

2️⃣ spec_to_design: DOG POOL FAQ
   🟢 完了

3️⃣ test_generation: phil-component
   ✅ 12 tests 生成

━━━━━━━━━━━━━━━━━━━━━━
⏸️ 保留 (blocked)
━━━━━━━━━━━━━━━━━━━━━━

4️⃣ claude_implementation: DOG POOL Phase5
   理由: 画像ファイルが _attachments/ に未配置
   解除方法:
     1. _attachments/dog-pool/ に実写画像を配置
     2. /retry JOB-20260418-XYZ

━━━━━━━━━━━━━━━━━━━━━━
🎯 今朝やること
━━━━━━━━━━━━━━━━━━━━━━

1. aimo の High 指摘 2 件の対応方針決定
2. DOG POOL 画像を配置して /retry

/summary full で完全版を表示
```

### 失敗パターン（failed あり）

```
🌅 朝の報告 (2026-04-18 06:00)

🚨 2/4 完走 / 1保留 / 1失敗 (22:30-03:15 / 4h45m)

━━━━━━━━━━━━━━━━━━━━━━
✅ 完了
━━━━━━━━━━━━━━━━━━━━━━

1️⃣ code_review: aimo → 🟠 High: 2件 / 🟡 Med: 5件
2️⃣ spec_to_design: FAQ → 🟢 完了

━━━━━━━━━━━━━━━━━━━━━━
⏸️ 保留
━━━━━━━━━━━━━━━━━━━━━━

3️⃣ test_generation: phil-component
   理由: 依存追加が必要 (@testing-library/react-hooks)

━━━━━━━━━━━━━━━━━━━━━━
❌ 失敗
━━━━━━━━━━━━━━━━━━━━━━

4️⃣ claude_implementation: portfolio OGP fix
   エラー: TypeScript コンパイル失敗
   詳細: vault/03_開発/Implementations/_errors/2026-04-18_portfolio.md

━━━━━━━━━━━━━━━━━━━━━━
🎯 今朝やること
━━━━━━━━━━━━━━━━━━━━━━

1. portfolio エラーログを確認
2. test-gen の依存追加判断
3. aimo の High 指摘対応

/summary full で完全版を表示
```

### 完全失敗パターン（全滅）

```
🚨🚨🚨 夜間バッチ全滅 (2026-04-18 06:00)

0/4 件完了

━━━━━━━━━━━━━━━━━━━━━━
❌ 全 Routine が失敗
━━━━━━━━━━━━━━━━━━━━━━

共通原因の可能性: [原因の仮説]

詳細ログ:
vault/03_開発/Morning Summaries/_incidents/2026-04-18_full-failure.md

━━━━━━━━━━━━━━━━━━━━━━
🎯 最優先対応
━━━━━━━━━━━━━━━━━━━━━━

1. インシデントログを確認
2. Worker の状態確認 (Render ダッシュボード)
3. Anthropic API / GitHub API の障害確認
```

---

## 📘 Vault 保存用（完全版）

### ファイル名
`vault/03_開発/Morning Summaries/2026-04-18_morning-summary.md`

### テンプレート

```markdown
---
type: morning-summary
date: 2026-04-18
batch_id: BATCH-20260417-XYZABC
routines_total: 4
routines_completed: 3
routines_blocked: 1
routines_failed: 0
duration: 6h42m
started_at: 2026-04-17 22:30
ended_at: 2026-04-18 05:12
tokens_consumed: 1,245,000
estimated_cost_usd: 12.45
tags: [スマホ司令塔, 朝サマリー, morning-summary]
---

# 🌅 朝サマリー 2026-04-18

## 📊 全体ステータス

| 項目 | 値 |
|---|---|
| 完了 | 3 / 4 |
| 保留 | 1 |
| 失敗 | 0 |
| 実行時間 | 22:30 〜 05:12 (6h 42m) |
| トークン消費 | 1,245,000 |
| 推定コスト | $12.45 |

## 🎯 今朝やること（優先順）

1. **PR #42 と #43 の最終レビュー**
   - 両方とも LGTM なら merge
   - 修正必要なら該当 branch で作業指示
2. **aimo の High 指摘 2 件の対応方針決定**
   - 詳細: `vault/03_開発/Code Reviews/2026-04-18_aimo.md`
3. **DOG POOL 画像を配置して /retry**
   - `_attachments/dog-pool/` に 6 枚配置

## ✅ 完了 Routine の詳細

### 1. code_review: aimo architecture レビュー

| 項目 | 値 |
|---|---|
| job_id | JOB-20260417-ABC123 |
| 実行時間 | 34m 12s |
| トークン | 185,000 |
| 対象 | `raioniik-crypto/aimo` / `branch:main` |
| 観点 | architecture / standard |

**サマリー**:
aimo のキャラクター性格パラメータシステムについて、レイヤー分離が不十分な箇所が 2 件。テスタビリティは良好。

**指摘内訳**:
- 🔴 Critical: 0 件
- 🟠 High: 2 件
  - H1: フィルの状態管理が Zustand と React Context で二重化
  - H2: Supabase 認証エラーハンドリングが UI 層に漏れ出している
- 🟡 Medium: 5 件
- 🟢 Low: 3 件
- 💡 Suggestion: 2 件

**朝の確認ポイント**:
- [ ] H1 の対応方針（Zustand に統一するか Context を削除するか）
- [ ] H2 のエラーハンドリング改善

**成果物**: `vault/03_開発/Code Reviews/2026-04-18_aimo-architecture.md`

---

### 2. spec_to_design: DOG POOL FAQ 設計

| 項目 | 値 |
|---|---|
| job_id | JOB-20260417-DEF456 |
| 実行時間 | 42m 03s |
| トークン | 310,000 |

**サマリー**:
FAQ セクションの UI 設計を awesome-design.md の Anthropic スタイルで生成。
アコーディオン展開、検索機能付き、モバイル最適化済み。

**成果物**: `vault/03_開発/Design Specs/2026-04-18_dog-pool-faq.md`

---

### 3. test_generation: aimo phil-component テスト生成

| 項目 | 値 |
|---|---|
| job_id | JOB-20260418-GHI789 |
| 実行時間 | 1h 8m |
| トークン | 420,000 |
| ブランチ | `claude/test-gen-ghi789-phil` |
| PR | https://github.com/raioniik-crypto/aimo/pull/42 |

**サマリー**:
PhilPanel コンポーネントに対して 12 個のテストケースを生成。
- レンダリング系: 4 件
- ユーザーイベント系: 5 件
- 状態遷移系: 3 件

**検証結果**:
- build: pass
- test: pass (全 12 件通過)
- lint: pass

**朝の確認ポイント**:
- [ ] PR #42 のレビュー
- [ ] テストケースの網羅性チェック

---

## ⏸️ 保留 Routine

### 4. claude_implementation: DOG POOL Phase5 画像統合

| 項目 | 値 |
|---|---|
| job_id | JOB-20260418-JKL012 |
| 停止時点 | 03:15 |
| ブロッカータイプ | B1（外部情報が必要） |

**ブロッカー内容**:
実写画像 6 枚が `_attachments/dog-pool/` に未配置のため、画像参照パスを確定できない。

**解除手順**:
1. `_attachments/dog-pool/` フォルダを作成
2. 以下 6 枚を配置:
   - `hero.jpg` - ヒーロー画像
   - `product-01.jpg` - 商品画像1
   - `product-02.jpg` - 商品画像2
   - `usecase-01.jpg` - 使用例1
   - `testimonial-01.jpg` - お客様の声写真
   - `og-image.jpg` - OGP 用
3. Discord で `/retry JOB-20260418-JKL012` を実行

**途中成果物**:
`vault/03_開発/Implementations/_wip/2026-04-18_dog-pool-phase5.md`

---

## ❌ 失敗 Routine

（このバッチでは失敗なし）

---

## 🔍 メトリクス

### トークン使用量内訳
| Routine | トークン | 割合 |
|---|---|---|
| code_review: aimo | 185,000 | 14.9% |
| spec_to_design: FAQ | 310,000 | 24.9% |
| test_generation: phil | 420,000 | 33.7% |
| impl: dog-pool (blocked) | 330,000 | 26.5% |
| **合計** | **1,245,000** | **100%** |

### コスト
- 推定: $12.45
- 月初累計: $47.23
- 月予算 ($200) 消化率: 23.6%

---

## 🔗 関連リソース

- **詳細ログ**: `vault/03_開発/Morning Summaries/_logs/2026-04-18/`
- **前日のサマリー**: `vault/03_開発/Morning Summaries/2026-04-17_morning-summary.md`
- **ロードマップ**: `voice-pipeline/docs/commander/roadmap.md`
- **現在のステータス**: `voice-pipeline/docs/commander/current_status.md`

## 🧠 Claude（統括）からの所感

（必要に応じて Claude が書く、今朝の全体傾向や気づき）

例:
- 今夜はコードレビュー系が安定して完走している
- DOG POOL 画像ブロッカーは毎回発生しているので、自動プリチェックを追加検討
- トークン消費が前日比 +30%、深夜帯の test_generation が重めだった

---

## 📝 このサマリーについて

- 生成: 2026-04-18 05:42 UTC
- 生成者: 朝サマリー Routine (自動)
- 次回バッチ: 本日 22:00 頃予定
```

---

## 🎨 視覚的ルール

### 絵文字の使い分け

| 絵文字 | 意味 |
|---|---|
| 🌅 | 朝サマリーのヘッダー |
| ✅ | 完了 (completed) |
| ⏸️ | 保留 (blocked) |
| ❌ | 失敗 (failed) |
| 🚨 | 重大警告 / 全滅 |
| ⚠️ | 部分的な問題 |
| 🔴 | Critical |
| 🟠 | High |
| 🟡 | Medium |
| 🟢 | Low |
| 💡 | Suggestion |
| 📋 | 一覧 |
| 🎯 | やるべきこと |
| 📊 | 統計 |
| 🧠 | 所感 |
| 🔗 | リンク |

### 文字装飾ルール

- 強調は `**` のみ
- 罫線は `━━━` （Discord 読みやすさ優先）
- 番号付けは `1️⃣ 2️⃣ 3️⃣`（視認性）

---

## 📤 配信・保存のフロー

### Step 1: Vault への完全版保存
夜間バッチ完了時、`routine-worker` が以下を実行：
1. 全 Routine の結果を集約
2. 完全版テンプレートに従って Markdown 生成
3. `vault/03_開発/Morning Summaries/{YYYY-MM-DD}_morning-summary.md` に保存
4. Obsidian Git push

### Step 2: Discord 配信（短縮版）
1. 完全版から短縮版を自動抽出
2. Discord の指定チャンネル or DM に配信
3. 配信時刻: デフォルト 06:00 JST（いさむのタイムゾーン）

### Step 3: 朝の操作
いさむが Discord から：
- `/summary full` → 完全版の Vault パスを返す
- `/summary yesterday` → 前日の完全版を返す
- `/retry {job_id}` → blocked job の再試行
- `/fail-log {job_id}` → failed job の詳細ログを取得

---

## 🎛️ カスタマイズポイント

いさむが後で調整できる項目：

- **配信時刻**: デフォルト 06:00 JST、変更可
- **配信先**: 指定チャンネル or DM、複数も可
- **短縮版の文字数上限**: Discord の制限に合わせて調整
- **絵文字のオン/オフ**: 好みで変更可
- **メトリクスの表示有無**: コスト見せたくない場合は非表示化

---

## 🔮 Phase 5 以降の拡張余地

AutoResearch 導入時に追加される要素：

- **傾向分析**: 週次で Routine の成功率推移を可視化
- **自動改善提案**: blocked パターンから rules の改善点を抽出
- **予測**: 「今夜のバッチは {X}% の確率で完走」等

---

## 📜 変更履歴

- v1.0 (2026-04-18): 初版
