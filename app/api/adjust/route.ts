import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { z } from "zod";
import { xPostSchema, imagePromptSchema, canvaTextsSchema } from "@/lib/schemas";
import { AdjustTarget } from "@/app/types";
import { createServerSupabase } from "@/lib/supabase/server";
import { getBalance, consumeCredits } from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/billing";

const PRIMARY_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-2.5-flash-lite";
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 1500;

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message || "";
  return msg.includes("503") || msg.includes("429") || msg.includes("overloaded") || msg.includes("RESOURCE_EXHAUSTED");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateWithRetry(model: GenerativeModel, prompt: string, retries = MAX_RETRIES): Promise<string> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (!isRetryableError(error) || attempt === retries) break;
      await sleep(RETRY_BASE_DELAY_MS * Math.pow(2, attempt));
    }
  }
  throw lastError ?? new Error("Unknown error");
}

function extractJSON(text: string): string {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();
  const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (jsonMatch) return jsonMatch[0];
  return text.trim();
}

// Target-specific prompt builders
function buildAdjustPrompt(target: AdjustTarget, currentContent: string, instruction: string): string {
  const targetLabel: Record<AdjustTarget, string> = {
    xPosts: "X（Twitter）投稿本文",
    imagePrompts: "画像生成プロンプト",
    canvaTexts: "Canva用文字素材",
  };

  const formatInstructions: Record<AdjustTarget, string> = {
    xPosts: `[
  { "label": "王道", "body": "...", "hashtags": ["...", "..."] },
  { "label": "共感重視", "body": "...", "hashtags": ["...", "..."] },
  { "label": "訴求強め", "body": "...", "hashtags": ["...", "..."] }
]`,
    imagePrompts: `[
  { "label": "...", "mainPrompt": "...(英語)", "mainPromptJa": "...(日本語訳)", "subPrompt": "...(英語)", "negativePrompt": "...(英語)", "aspectRatio": "1:1" }
]`,
    canvaTexts: `{
  "coverTitles": ["..."],
  "subTitles": ["..."],
  "highlightWords": ["..."],
  "descriptions": ["..."],
  "ctaTexts": ["..."],
  "badgeShortTexts": ["..."]
}`,
  };

  return `あなたはSNSマーケティングの専門家です。

以下は現在の「${targetLabel[target]}」の生成結果です。

## 現在のコンテンツ
${currentContent}

## 調整指示
${instruction}

## 出力ルール
- 上記の調整指示に従って、コンテンツを微調整してください
- 構造やラベルは維持し、文面の表現やトーンのみ変更してください
- **必ずJSON形式のみ**で返してください。説明文やマークダウンは一切不要です
- 以下の形式で返してください:

${formatInstructions[target]}

JSONのみを返してください。`;
}

// Target-specific validators
const validators: Record<AdjustTarget, z.ZodType> = {
  xPosts: z.array(xPostSchema),
  imagePrompts: z.array(imagePromptSchema),
  canvaTexts: canvaTextsSchema,
};

export async function POST(request: NextRequest) {
  try {
    // --- Auth & Credit check ---
    const supabase = createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "ログインが必要です。", requireAuth: true },
        { status: 401 }
      );
    }

    const balance = await getBalance(user.id);
    const cost = CREDIT_COSTS.adjust;
    if (balance < cost) {
      return NextResponse.json(
        { error: `クレジットが不足しています（必要: ${cost}、残高: ${balance}）`, insufficientCredits: true },
        { status: 402 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY が設定されていません。" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { target, currentContent, instruction } = body as {
      target: AdjustTarget;
      currentContent: unknown;
      instruction: string;
    };

    if (!target || !currentContent || !instruction) {
      return NextResponse.json(
        { error: "target, currentContent, instruction は必須です。" },
        { status: 400 }
      );
    }

    if (!validators[target]) {
      return NextResponse.json(
        { error: "無効なtargetです。" },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const prompt = buildAdjustPrompt(target, JSON.stringify(currentContent, null, 2), instruction);

    let text: string;
    try {
      const primaryModel = genAI.getGenerativeModel({ model: PRIMARY_MODEL });
      text = await generateWithRetry(primaryModel, prompt);
    } catch {
      try {
        const fallbackModel = genAI.getGenerativeModel({ model: FALLBACK_MODEL });
        text = await generateWithRetry(fallbackModel, prompt, 1);
      } catch {
        return NextResponse.json(
          { error: "現在AIサーバーが混み合っています。少し待ってから再試行してください。" },
          { status: 503 }
        );
      }
    }

    const jsonStr = extractJSON(text);

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { error: "AIからの応答をパースできませんでした。もう一度お試しください。" },
        { status: 502 }
      );
    }

    const validated = validators[target].safeParse(parsed);
    if (!validated.success) {
      return NextResponse.json(
        { error: "AIからの応答形式が一致しませんでした。もう一度お試しください。" },
        { status: 502 }
      );
    }

    // Consume credits on success only
    await consumeCredits(user.id, cost, "adjust", crypto.randomUUID());

    return NextResponse.json({ target, data: validated.data });
  } catch (error) {
    console.error("Adjust API error:", error);
    return NextResponse.json(
      { error: "調整中にエラーが発生しました。もう一度お試しください。" },
      { status: 500 }
    );
  }
}
