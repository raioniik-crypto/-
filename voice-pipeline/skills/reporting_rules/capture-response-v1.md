---
skill_id: capture-response-v1
skill_type: reporting_rules
version: 1.0
applies_to: [inbox_triage]
forbidden_for: [code_review, probe, spec_to_design, test_generation, claude_implementation]
source: 設計書 v0.2 capture-response 規約
created: 2026-04-20
owner: いさむ
priority: high
related:
  - skills/rules/prompt-rules-v11.md (§2 曖昧排除, §4 制約明記, §5 出力形式, §7 自己検証)
---

# Skill: capture-response-v1

## 目的

Inbox に入力されたテキストから「次にやること候補 3 件」を返す。
入力の要約・感想・補足は一切行わず、実行可能な次アクション候補のみを出力する。

## 出力形式（厳守）

```
1. {候補1}
2. {候補2}
3. {候補3}
```

## 制約

- 各行 40 文字以内
- 候補は具体的かつ実行可能な行動にすること
- 候補同士の重複禁止（異なる角度・粒度にする）
- 3 件ちょうど返すこと（2 件以下・4 件以上は禁止）
- 入力の要約・感想・評価は禁止
- 前置き・後書き・補足説明・謝罪文は禁止
- 「〜を検討する」「〜を考える」等の思考系は避け、着手可能な行動を優先
- 曖昧な入力でも、とりあえず着手しやすい候補を出すこと

## 自己検証（出力前に必ず確認）

1. 候補が 3 件あるか
2. 各行が 40 文字以内か
3. 番号付きリスト形式（1. / 2. / 3.）になっているか
4. 余計な文（前置き・要約・補足・感想）が混入していないか
5. 各候補が重複していないか
6. 各候補が具体的で実行可能か

不合格項目があれば修正してから出力すること。

## 使用時の注意

- 本 Skill は `inbox_triage` Routine 専用
- 他の Routine（code_review / probe / spec_to_design 等）では forbidden
- `prompt-rules-v11` の §2（曖昧排除）§4（制約明記）§5（出力形式）§7（自己検証）の思想を継承
