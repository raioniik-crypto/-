---
type: pending-revision-note
target: voice-pipeline/docs/commander/rules/_common.md
from_version: v1.1
to_version: v1.2
created: 2026-04-18
planned_revision_at: Phase 1 完了時
owner: Claude 統括
status: pending（Phase 1 完走時に反映）
---

# _common.md v1.2 改訂予定メモ

> **このファイルは v1.2 改訂までの保留事項を記録するメモ**
> Phase 1 完了時に Claude 統括が `_common.md` を書き換え、その際このメモは `_archive/` に移動する

---

## 改訂の背景

Phase 1 実装を進める中で、以下の知見・反省点が蓄積された：

1. **Task 2 の F7 境界の曖昧さ**（環境変数追加の範囲が未規定）
2. **Task 1 の pg_cron 設計判断 vs 実機乖離**（公式ドキュメント推奨と実機動作の食い違い）

これらを v1.2 で明文化する。

---

## 改訂項目（Phase 1 完了時点で再精査）

### 項目 1: 環境変数の追加範囲（F7 補強）

**追加位置**: `F7: 既存インフラへの接触` の末尾、または新セクション「環境変数の追加範囲」として独立

**追加内容**:

```
### 環境変数の追加範囲

- 新規 Routine 用の環境変数は、新規 routine-worker のみに設定する
- 既存サービス（voice-pipeline-api / voice-pipeline-worker / voice-pipeline-discord-bot）
  への環境変数追加は F7 抵触の可能性がある
- 例外: 既存サービスが実際に参照する必要が発生した時点で、
  明示的に F7 例外として承認を得てから追加する
- Phase 1 Task 2 で既存 3 サービスに SUPABASE_* を設定したのは結果オーライ扱い、
  削除による再デプロイリスクを避けるため現状維持
```

**由来**: Phase 0 Claude の指摘 1（Task 2 の F7 境界）への対応。

---

### 項目 2: 設計判断と実機検証の優先順位（新設）

**追加位置**: 「🔒 検証の実行ルール」の次、または独立セクションとして追加

**追加内容**:

```
### 🔬 設計判断と実機検証の優先順位

- 指示書が公式ドキュメントベースで設計判断を下しても、実機で動かない
  場合は **実機動作を優先** する
- 実機検証で設計と食い違った場合、Claude Code は以下を実施：
  1. 動作した方式を採用
  2. 完了報告に「design_vs_reality」セクションを追加
  3. 食い違った理由（プラン差、バージョン差、公式ドキュメントの
     不完全性等）の仮説を記載
- この知見は Phase 5 の AutoResearch で設計プロセスの改善に活用
```

**由来**: Phase 0 Claude の指摘 2（pg_cron 公式推奨 `extensions.cron.schedule()` vs 実機動作 `cron.schedule()`）への対応。

---

### 項目 3 以降: Phase 1 完走時に追加候補

Phase 1 残 6 タスク（Task 4〜9）で得られた知見を追加予定：

- Docker ビルド系の知見（Task 7 実施後）
- routine-worker 実装系の知見（Task 4 実施後）
- 朝サマリー系の知見（Task 9 実施後）
- その他

---

## 改訂実施時のチェックリスト（Phase 1 完了時用）

Claude 統括が v1.2 改訂を行う際の手順：

- [ ] `_common.md` 現行 v1.1 を `_archive/_common_v1_1.md` にコピー
- [ ] 項目 1〜2（+ Phase 1 で追加された項目）を反映
- [ ] フロントマターの `version` を `1.2` に更新
- [ ] `updated` を Phase 1 完了日に更新
- [ ] 変更履歴セクションに v1.2 エントリを追加
- [ ] 本メモファイルを `_handover/_archive/` に移動
- [ ] `_handover/` に `2026-MM-DD_phase1-phase2.md` handover ファイルを新規作成

---

## 📜 変更履歴

- 2026-04-18: 初版作成（項目 1, 2 記載）
