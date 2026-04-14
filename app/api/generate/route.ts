import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateResultSchema } from "@/lib/schemas";
import { FormInput, FORM_FIELD_LABELS } from "@/app/types";

function buildPrompt(input: FormInput): string {
  const fields = Object.entries(FORM_FIELD_LABELS)
    .map(([key, label]) => {
      const value = input[key as keyof FormInput];
      if (!value && value !== 0) return null;
      return `【${label}】\n${value}`;
    })
    .filter(Boolean)
    .join("\n\n");

  return `あなたはSNSマーケティングの専門家です。以下の情報をもとに、X（Twitter）投稿コンテンツを生成してください。

## 入力情報
${fields}

## 出力指示
以下の4種類のコンテンツを**必ずJSON形式のみ**で返してください。JSON以外のテキスト（説明文やマークダウン）は一切含めないでください。

### 1. X投稿本文（xPosts）
- 3パターン生成（「王道」「共感重視」「訴求強め」）
- 各投稿は140文字以内を目安
- ハッシュタグを3〜5個付与
- NG表現があれば絶対に使わない

### 2. カルーセル文言（carousel）
- ${input.carouselSlides}枚分のスライド文言
- 各スライドにtitle（見出し）、subtitle（サブ見出し）、body（本文）を含める
- 1枚目はアイキャッチ、最後はCTA

### 3. Gemini画像生成プロンプト（imagePrompts）
- 3パターン生成（「王道訴求」「感情訴求」「世界観重視」）
- mainPrompt: メインの画像生成指示（英語）
- mainPromptJa: mainPromptの日本語訳（自然な日本語で意味が分かるように）
- subPrompt: スタイル指定（英語）
- negativePrompt: 生成しない要素（英語）
- aspectRatio: "1:1" or "16:9" or "9:16"

### 4. Canva用文字素材（canvaTexts）
- coverTitles: カバー用タイトル案（2〜3個）
- subTitles: サブタイトル案（2〜3個）
- highlightWords: 強調ワード（3〜5個）
- descriptions: 説明文（2〜3個）
- ctaTexts: CTA文言（2〜3個）
- badgeShortTexts: バッジ・ラベル用短文（3〜5個）

## JSON構造（厳守）
\`\`\`json
{
  "xPosts": [
    { "label": "王道", "body": "...", "hashtags": ["...", "..."] },
    { "label": "共感重視", "body": "...", "hashtags": ["...", "..."] },
    { "label": "訴求強め", "body": "...", "hashtags": ["...", "..."] }
  ],
  "carousel": [
    { "slideNumber": 1, "title": "...", "subtitle": "...", "body": "..." }
  ],
  "imagePrompts": [
    { "label": "王道訴求", "mainPrompt": "...", "mainPromptJa": "...", "subPrompt": "...", "negativePrompt": "...", "aspectRatio": "1:1" }
  ],
  "canvaTexts": {
    "coverTitles": ["..."],
    "subTitles": ["..."],
    "highlightWords": ["..."],
    "descriptions": ["..."],
    "ctaTexts": ["..."],
    "badgeShortTexts": ["..."]
  }
}
\`\`\`

JSONのみを返してください。コードブロック記号(\`\`\`)も不要です。純粋なJSONだけを返してください。`;
}

function extractJSON(text: string): string {
  // Try to find JSON in code blocks first
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find a JSON object directly
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  return text.trim();
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY が設定されていません。.env.local を確認してください。" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const input = body as FormInput;

    if (!input.productName?.trim()) {
      return NextResponse.json(
        { error: "商品名 / サービス名は必須です。" },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = buildPrompt(input);

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    const jsonStr = extractJSON(text);

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        {
          error: "AIからの応答をJSONとしてパースできませんでした。もう一度お試しください。",
          rawText: text.substring(0, 500),
        },
        { status: 502 }
      );
    }

    const validated = generateResultSchema.safeParse(parsed);
    if (!validated.success) {
      return NextResponse.json(
        {
          error: "AIからの応答が期待される形式と一致しませんでした。もう一度お試しください。",
          details: validated.error.issues.map((i) => i.message).join(", "),
        },
        { status: 502 }
      );
    }

    return NextResponse.json(validated.data);
  } catch (error) {
    console.error("Generate API error:", error);
    const message =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
