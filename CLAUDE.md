## 必須：作業開始前に必ず読むこと
以下のいさむのコンテキストを把握してから作業を開始すること。

- 名前：いさむ、福岡那珂川市、大学休学中
- 職業：AIフリーランサー（Coconala、Fiverr、クラウドワークス）
- 技術：Next.js14、Supabase、Tailwind CSS、Framer Motion、Zustand
- AIツール：Claude MAX、ChatGPT Plus、Gemini API、Claude Code
- X：@isamu_freelance
- ポートフォリオ：isamu-portfolio.vercel.app

---
# プロジェクト概要
超精密プロンプト自動生成Webアプリ

# 技術スタック
Next.js14、TypeScript、Tailwind CSS、Anthropic API、Framer Motion

# 主要機能
- STEP1：やりたいこと入力
- STEP2：選択式アンケート（その他欄あり）
- STEP3：プロンプト生成（おすすめ順）
- STEP4：実行・検証・追加提案

---
## コーディングルール
- 関数コンポーネントのみ
- any型禁止
- console.logはデバッグ用のみ
- 1回の変更で5ファイル以上同時編集禁止
- 新しい依存関係の追加前に必ず確認

## ワークフロー
1. 探索：コードベースを読んで現状把握
2. 計画：変更内容を提示して確認
3. 実装：小さな単位で変更
4. 検証：npm run build && npx tsc --noEmit

## やってはいけないこと
- 既存ファイルを確認せずに新規ファイルを作成
- .env.localの内容をログに含める
- package.jsonの依存関係を勝手に追加
