import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const client = new OpenAI();

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    // Step 1: Execute the prompt
    const execution = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const executionResult = execution.choices[0]?.message?.content || "";

    // Step 2: Verify the result
    const verification = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "あなたはAI出力の品質検証の専門家です。必ず指定されたJSON形式のみで回答してください。JSON以外の文字は含めないでください。",
        },
        {
          role: "user",
          content: `以下のプロンプトとその実行結果を検証してください。

【使用したプロンプト】
${prompt}

【実行結果】
${executionResult}

以下の3つの観点で検証し、JSON形式で返してください：

1. errors: 出力に含まれる矛盾、不完全な箇所、論理的な誤りのリスト
2. sourceFlags: 事実確認が必要な箇所のリスト（「〜は要確認」の形式）
3. suggestions: 出力をさらに改善するための追加要素の提案リスト

{"errors":["エラー1","エラー2"],"sourceFlags":["要確認事項1","要確認事項2"],"suggestions":["提案1","提案2"]}`,
        },
      ],
    });

    const verifyText = verification.choices[0]?.message?.content || "";
    const jsonMatch = verifyText.match(/\{[\s\S]*\}/);

    let verifyData = { errors: [], sourceFlags: [], suggestions: [] };
    if (jsonMatch) {
      try {
        verifyData = JSON.parse(jsonMatch[0]);
      } catch {
        // Use defaults if parsing fails
      }
    }

    return NextResponse.json({
      result: executionResult,
      errors: verifyData.errors || [],
      sourceFlags: verifyData.sourceFlags || [],
      suggestions: verifyData.suggestions || [],
    });
  } catch (error) {
    console.error("execute-verify error:", error);
    return NextResponse.json(
      { error: "実行・検証に失敗しました。もう一度お試しください。" },
      { status: 500 }
    );
  }
}
