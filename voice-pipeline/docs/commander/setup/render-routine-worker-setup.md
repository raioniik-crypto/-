---
type: setup-guide
target: voice-pipeline-routine-worker
platform: Render
created: 2026-04-18
execute_at: Phase 1 タスク 7
---

# Render Background Worker セットアップ手順

> **このファイルの目的**: Render Dashboard で `voice-pipeline-routine-worker` を新規作成する手順書。
> **いつ実行するか**: Phase 1 タスク 7（Render デプロイ）のとき。タスク 3〜6 完了後に実施する。

---

## 前提条件

以下がすべて完了していること：

- [x] `Dockerfile.routine-worker` が GitHub に push 済み
- [x] Supabase 環境変数 3 本が既存サービスに設定済み（タスク 2）
- [x] `src/routine-worker.ts` が実装済み（タスク 4）
- [x] API エンドポイント追加済み（タスク 5）
- [x] Discord コマンド追加済み（タスク 6）

---

## 手順 0: Anthropic API Key の発行

Routine Worker が Claude Code CLI を使うために、専用の API キーが必要です。

▶ ここから作業

1. ブラウザで **console.anthropic.com** を開く
2. ログインする
3. 左メニューの **API Keys** をクリック
4. **Create Key** ボタンを押す
5. 以下を入力:

```
Name: isamu-commander-routine-worker
```

6. **Create** を押す
7. 表示されたキー（`sk-ant-...` で始まる文字列）を**メモ帳にコピペして一時保存**
   - ⚠️ この画面を閉じるとキーは二度と表示されない
8. 予算アラートの設定（推奨）:
   - Settings → Spend Limits
   - Monthly Limit: **$100**（超過で自動停止）
   - Alert Threshold: **$50**（メール通知）

◀ ここで完了（キーをメモ帳に保持した状態で次へ）

**重要**:
- このキーは Claude MAX の対話用キーとは**別物**
- 対話用キーを流用しない（用途分離で事故防止）

---

## 手順 1: Render Dashboard にログイン

▶ ここから作業

1. ブラウザで **dashboard.render.com** を開く
2. ログインする
3. ダッシュボードが表示されたら OK

◀ ここで完了

**確認**: 左側に既存の 3 サービスが見えていること:
- `voice-pipeline-api`
- `voice-pipeline-worker`
- `voice-pipeline-discord-bot`

---

## 手順 2: 既存 Worker のリージョン確認

新規 Worker のリージョンを、既存 Worker と揃えます。

▶ ここから作業

1. 既存の `voice-pipeline-worker` をクリック
2. **Settings** タブを開く
3. **Region** の値をメモする（例: `Oregon (US West)`, `Frankfurt (EU Central)` 等）

◀ ここで完了

このリージョンを手順 3 で使います。

---

## 手順 3: 新規 Background Worker 作成

▶ ここから作業

1. ダッシュボード右上の **New +** ボタンをクリック
2. **Background Worker** を選択
3. **Connect a repository** 画面で:
   - GitHub リポジトリ `raioniik-crypto/-` を選択
   - **Connect** を押す

4. **設定画面**で以下を入力:

| 項目 | 設定値 |
|------|--------|
| **Name** | `voice-pipeline-routine-worker` |
| **Region** | 手順 2 でメモしたリージョンと同じ |
| **Branch** | `main` |
| **Root Directory** | `voice-pipeline` |
| **Runtime** | **Docker** を選択 |
| **Dockerfile Path** | `./Dockerfile.routine-worker` |
| **Instance Type** | **Standard** ($25/月) |

**Branch を `main` に固定する理由**:
- Render Worker は長期運用される。作業ブランチ名は Phase ごとに変わるため、固定ブランチを参照させる必要がある
- `main` に Phase 1 完走後のコードが merge された状態で Worker が動く前提
- Phase 2 以降の開発中も Worker は main を参照し続けるため、開発と運用が分離される

5. **まだ Create を押さない**。先に手順 4 の環境変数を設定する。

◀ 手順 4 へ進む

---

## 手順 4: 環境変数の設定

Worker 作成画面の下部に「Environment Variables」セクションがあります。

### 共通ルール
- 既存 `voice-pipeline-worker` で使われている変数は、**同じ値をコピー**してください
- Render Dashboard > voice-pipeline-worker > Settings > Environment で確認できます

### 変数一覧

| # | 変数名 | 値の取得元 | 用途 |
|---|--------|-----------|------|
| 1 | `SUPABASE_URL` | Supabase Dashboard > Settings > API | Supabase 接続先 |
| 2 | `SUPABASE_ANON_KEY` | Supabase Dashboard > Settings > API | 将来用（現在未使用） |
| 3 | `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard > Settings > API | job_locks 排他制御用 |
| 4 | `ANTHROPIC_API_KEY` | 手順 0 で発行したキー | Claude Code CLI 用 |
| 5 | `GITHUB_TOKEN` | 既存 worker からコピー | GitHub Contents API 認証 |
| 6 | `GITHUB_REPO` | 既存 worker からコピー | 対象リポジトリ (`owner/repo` 形式) |
| 7 | `GITHUB_BRANCH` | 既存 worker からコピー | Vault 書き込み先ブランチ (デフォルト: `main`) |
| 8 | `GITHUB_VAULT_PATH` | 既存 worker からコピー | リポジトリ内の Vault ディレクトリ (デフォルト: 空文字) |

▶ ここから作業

以下の環境変数を **1 つずつ** 追加してください：

#### 変数 1: SUPABASE_URL
```
Key:   SUPABASE_URL
Value: （Supabase Dashboard > Settings > API の Project URL をコピペ）
```
- routine-worker 専用。排他制御 (job_locks) で使用

#### 変数 2: SUPABASE_ANON_KEY
```
Key:   SUPABASE_ANON_KEY
Value: （Supabase Dashboard > Settings > API の anon public key をコピペ）
```
- 将来用。現時点では service_role のみ使用するが、保持しておく

#### 変数 3: SUPABASE_SERVICE_ROLE_KEY
```
Key:   SUPABASE_SERVICE_ROLE_KEY
Value: （Supabase Dashboard > Settings > API の service_role key をコピペ）
```
- job_locks テーブルへのアクセスに実際に使われるキー

#### 変数 4: ANTHROPIC_API_KEY
```
Key:   ANTHROPIC_API_KEY
Value: （手順 0 でメモ帳に保存した sk-ant-... キーをコピペ）
```
- Claude Code CLI がこのキーで Anthropic API を呼ぶ
- 既存 worker の `ANTHROPIC_API_KEY` とは別の専用キーを使う

#### 変数 5: GITHUB_TOKEN
```
Key:   GITHUB_TOKEN
Value: （既存 voice-pipeline-worker の Environment からコピー）
```
- 既存 worker と同じ変数名・同じ値
- 参照箇所: `src/github-store.ts:5`, `src/pipeline.ts:14`

#### 変数 6: GITHUB_REPO
```
Key:   GITHUB_REPO
Value: （既存 voice-pipeline-worker の Environment からコピー）
```
- 既存 worker と同じ変数名・同じ値 (例: `raioniik-crypto/-`)
- 参照箇所: `src/github-store.ts:6`, `src/pipeline.ts:15`

#### 変数 7: GITHUB_BRANCH
```
Key:   GITHUB_BRANCH
Value: （既存 voice-pipeline-worker の Environment からコピー、未設定ならデフォルト `main`）
```
- 既存 worker と同じ変数名
- コード上のデフォルト値: `"main"` (`src/github-store.ts:7`, `src/pipeline.ts:16`)

#### 変数 8: GITHUB_VAULT_PATH
```
Key:   GITHUB_VAULT_PATH
Value: （既存 voice-pipeline-worker の Environment からコピー、未設定ならデフォルト空文字）
```
- 既存 worker と同じ変数名
- コード上のデフォルト値: `""` (`src/pipeline.ts:17`, `src/worker.ts:89,137,344`)

◀ すべて入力したら手順 5 へ

---

## 手順 5: Worker 作成の実行

▶ ここから作業

1. 環境変数がすべて入力されていることを確認
2. **Create Background Worker** ボタンを押す
3. ビルドが自動的に開始される
4. ビルドログを見守る（5〜10 分程度）

◀ ここで完了

---

## 手順 6: うまくいった状態の確認

ビルド完了後、以下が確認できれば成功：

- ステータスが **Deploy succeeded** になっている
- Logs タブでワーカーの起動ログが表示される
- エラーでクラッシュループしていない

**注意**: `src/routine-worker.ts` が未実装の場合、起動後にファイルが見つからないエラーで停止します。これはタスク 4 完了後に解消されるため、この段階では正常な挙動です。

---

## つまずいたときの確認

### ビルドエラー: `Dockerfile not found`
→ Dockerfile Path が `./Dockerfile.routine-worker` になっているか確認
→ Root Directory が `voice-pipeline` になっているか確認

### ビルドエラー: `npm ci failed`
→ `package-lock.json` が GitHub に push されているか確認
→ ブランチが正しいか確認

### ビルドエラー: Claude Code CLI インストール失敗
→ バージョン番号が正しいか確認（`@anthropic-ai/claude-code@2.1.114`）
→ ネットワーク一時障害の可能性 → もう一度 Manual Deploy

### 起動後にクラッシュループ
→ `src/routine-worker.ts` が実装済みか確認（タスク 4）
→ 環境変数が正しく設定されているか確認
→ Logs タブでエラーメッセージを確認

---

## やってはいけないこと

- ❌ 既存の `voice-pipeline-worker` の設定を変更する
- ❌ 既存の `voice-pipeline-api` の設定を変更する
- ❌ 既存の `voice-pipeline-discord-bot` の設定を変更する
- ❌ Instance Type を Starter にする（Standard 以上が必要）
- ❌ Runtime を Docker 以外にする
- ❌ 作業ブランチ（`claude/...`）を指定する（main 固定が正）

---

## 📜 変更履歴

- v1.0 (2026-04-18): 初版作成
