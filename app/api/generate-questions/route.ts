import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const client = new OpenAI();

export async function POST(req: NextRequest) {
  try {
    const { userInput, questionCount } = await req.json();

    if (!userInput || !questionCount) {
      return NextResponse.json(
        { error: "userInput and questionCount are required" },
        { status: 400 }
      );
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "あなたはプロンプトエンジニアリングの専門家です。必ず指定されたJSON形式のみで回答してください。JSON以外の文字は含めないでください。",
        },
        {
          role: "user",
          content: `ユーザーが以下のようにやりたいことを入力しました：

「${userInput}」

この要望をより正確に理解し、最適なプロンプトを生成するために、ユーザーに確認すべき質問を${questionCount}個生成してください。

ルール：
- 各質問は選択式にすること
- 各質問の選択肢は4〜6個にすること
- 各質問の最後の選択肢は必ず「その他（自由記入）」にすること
- 質問は具体的で、プロンプト生成に直結する内容にすること
- 日本語で回答すること

以下のJSON形式で返してください：
{"questions":[{"q":"質問文","options":["選択肢1","選択肢2","選択肢3","選択肢4","その他（自由記入）"]}]}`,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content || "";
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
    console.error("generate-questions error:", error);
    return NextResponse.json(
      { error: "質問の生成に失敗しました。もう一度お試しください。" },
      { status: 500 }
    );
  }
}
