---
type: setup-guide
target: morning-summary
created: 2026-04-19
execute_at: Phase 1 Task 9
---

# 朝サマリー セットアップ手順

## 前提

- routine-worker が Render 上で稼働中
- Supabase `isamu-commander-locks` プロジェクトにアクセス可能

## 手順 1: Supabase SQL 実行

1. Supabase Dashboard > SQL Editor を開く
2. 新規 Query を作成
3. `voice-pipeline/sql/task9_morning_summary_log_setup.sql` の内容を貼り付け
4. Run を押す

## 手順 2: Discord Webhook 作成

1. Discord サーバーの **サーバー設定 > 連携サービス > Webhook** を開く
2. **新しい Webhook** をクリック
3. 名前: `朝サマリー Bot` (任意)
4. チャンネル: `#voice-log` (またはお好みのチャンネル)
5. **Webhook URL をコピー** ボタンを押す
6. コピーした URL をメモ帳に一時保存

## 手順 3: Render 環境変数追加

1. Render Dashboard > `voice-pipeline-routine-worker` > Settings > Environment
2. **Add Environment Variable** をクリック
3. 以下を追加:

```
Key:   MORNING_SUMMARY_WEBHOOK_URL
Value: （手順 2 でコピーした Webhook URL）
```

4. Save Changes → 自動再デプロイ

## 手順 4: デバッグモード動作確認

1. Render 環境変数に一時追加:

```
Key:   MORNING_SUMMARY_DEBUG
Value: 1
```

2. Save → 再デプロイ
3. 1-2 分待つ
4. Discord チャンネルに朝サマリーが届くことを確認
5. GitHub repo の `vault/03_開発/Morning Summaries/` にファイルが作成されていることを確認
6. 確認できたら `MORNING_SUMMARY_DEBUG` を**削除** → Save → 再デプロイ

## 手順 5: 本番確認

翌朝 06:00 JST に自動で朝サマリーが生成・配信されることを確認。

## トラブルシューティング

### Discord に届かない
- Render Logs でエラーを確認
- `MORNING_SUMMARY_WEBHOOK_URL` が正しく設定されているか確認
- Webhook が有効（削除されていない）か Discord 側で確認

### Vault に保存されない
- `GITHUB_TOKEN` / `GITHUB_REPO` が routine-worker に設定されているか確認
- Render Logs で GitHub API エラーを確認

### 毎回生成される（重複）
- Supabase の `morning_summary_log` テーブルが作成されているか確認
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` が設定されているか確認
