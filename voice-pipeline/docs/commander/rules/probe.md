---
type: routine-rules
routine: probe
scope: routine_specific
version: 1.0
created: 2026-04-19
inherits: _common.md v1.2
phase: Phase 2
---

# Routine: probe

> Repo Capability Probe — 対象リポジトリのインフラ前提を機械的に検査する。

## 目的

対象 repo の capability を GitHub API 経由で自動検査し、後続 Routine の前提条件を確定する。

## scope

- 読み取り: 対象 repo の metadata（GitHub API のみ）
- 書き込み: Vault `vault/03_開発/Repo Capability Reports/` のみ

## 禁止事項

- 対象 repo への push / PR 作成 / issue 作成
- clone 後のファイル書き込み
- Supabase / Discord への直接書き込み（job_locks / morning_summary_log は通常フローで使用可）

## 出力

- `vault/03_開発/Repo Capability Reports/{date}_{time}_{repo}.json`
- `vault/03_開発/Repo Capability Reports/{date}_{time}_{repo}.md`

## 完了条件

- JSON + md 両方が Vault に保存されている
- `RoutineFinalResult.status = "completed"`
- `artifact_paths` に 2 ファイルのパスが記載されている

## ブロッカー

- B1: `GITHUB_TOKEN` 未設定
- B3: 対象 repo が private で読み取り権限なし
- その他 B1〜B7 は `_common.md` 参照

## 変更履歴

- v1.0 (2026-04-19): 初版
