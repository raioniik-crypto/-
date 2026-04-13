import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { userInput, answers, promptCount } = await req.json();

    if (!userInput || !answers || !promptCount) {
      return NextResponse.json(
        { error: "userInput, answers, and promptCount are required" },
        { status: 400 }
      );
    }

    const answersText = answers
      .map(
        (a: { question: string; answer: string }, i: number) =>
          `Q${i + 1}: ${a.question}\nA${i + 1}: ${a.answer}`
      )
      .join("\n\n");

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `あなたは世界最高のプロンプトエンジニアです。
以下の情報をもとに、ユーザーの目的を達成するための超精密プロンプトを${promptCount}個生成してください。

【ユーザーのやりたいこと】
${userInput}

【アンケート回答】
${answersText}

ルール：
- おすすめ順に番号をつけること（1が最もおすすめ）
- 各プロンプトは即座にコピー＆ペーストで使える完成形にすること
- プロンプト本文は具体的かつ詳細に書くこと
- 各プロンプトに対して使用用途、推奨AI、注意事項を付けること
- 日本語で回答すること

以下のJSON形式で返してください（JSON以外の文字は含めないこと）：
{"prompts":[{"rank":1,"title":"プロンプトのタイトル","prompt":"プロンプト本文","usecase":"使用用途の説明","tips":{"ai":"推奨AIの名前","reason":"推奨理由"},"warning":"使用上の注意"}]}`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("generate-prompts error:", error);
    return NextResponse.json(
      { error: "プロンプトの生成に失敗しました。もう一度お試しください。" },
      { status: 500 }
    );
  }
}
