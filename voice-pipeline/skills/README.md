# Skills Directory

Phase 2 以降の Routine が Claude Code 実行時に読み込む知識・ルール集。

## 構造

- `knowledge/` — 知識ベース（用語定義、ドメイン知識）
- `rules/` — 運用ルール、品質規約
- `failure_patterns/` — 失敗パターン集（Phase 3 で本格運用）
- `reporting_rules/` — 報告フォーマット（Phase 2 後半で追加予定）
- `skill-manifest.json` — Skill 一覧 + Routine との紐付け

## 使用方法

Skills の読み込みは `src/skill-loader.ts`（P2-2 で実装）が manifest.json を参照して行う。
本ディレクトリは Phase 2 P2-1 時点では「ファイル配置済み、読み込み機構未実装」の状態。

## Skill 追加手順

1. 元ドキュメントの監査（skill admission checklist、phase2-operational-principles.md 第 VII 部）
2. md ファイルを適切なディレクトリに配置
3. manifest.json に登録
4. Routine との紐付けを更新
5. PR 作成 → いさむ承認 → merge

## 現在の Skill 一覧

| Skill | Type | Status |
|---|---|---|
| philosophy-dictionary | knowledge | 登録済み、Phase 2 中は forbidden |
| prompt-rules-v11 | rules | アクティブ（Phase 2 新 Routine で使用） |
| claude-management-v10 | rules | アクティブ（Phase 2 新 Routine で使用） |

## 関連ドキュメント

- `docs/commander/rules/_common.md` v1.2 — 全 Routine 共通ルール
- `docs/commander/_handover/` — Phase 間引き継ぎドキュメント
- `phase2-operational-principles.md` — Phase 2 運用原則（第 VII 部に skill admission checklist）
