import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { generateResultSchema } from "@/lib/schemas";
import { FormInput, FORM_FIELD_LABELS } from "@/app/types";

// ==========================================
// モデル設定
// ==========================================
const PRIMARY_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-2.5-flash-lite";
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1500;

// ==========================================
// リトライ可能なステータスコード
// ==========================================
const RETRYABLE_STATUS_CODES = new Set([429, 503]);

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message || "";
  // Google AI SDK wraps HTTP errors with status in the message
  return (
    RETRYABLE_STATUS_CODES.has(extractStatusCode(msg)) ||
    msg.includes("503") ||
    msg.includes("429") ||
    msg.includes("overloaded") ||
    msg.includes("unavailable") ||
    msg.includes("RESOURCE_EXHAUSTED")
  );
}

function extractStatusCode(message: string): number {
  const match = message.match(/\b(4\d{2}|5\d{2})\b/);
  return match ? parseInt(match[1]) : 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ==========================================
// リトライ付き生成関数
// ==========================================
async function generateWithRetry(
  model: GenerativeModel,
  prompt: string,
  retries: number = MAX_RETRIES
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `[Gemini] Attempt ${attempt + 1}/${retries + 1} failed: ${lastError.message}`
      );

      if (!isRetryableError(error) || attempt === retries) {
        break;
      }

      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
      console.log(`[Gemini] Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  throw lastError ?? new Error("Unknown generation error");
}

// ==========================================
// エラーメッセージの日本語化
// ==========================================
function toUserFriendlyError(error: unknown): { message: string; status: number } {
  if (!(error instanceof Error)) {
    return { message: "不明なエラーが発生しました。", status: 500 };
  }

  const msg = error.message || "";
  const code = extractStatusCode(msg);

  if (code === 429 || msg.includes("RESOURCE_EXHAUSTED")) {
    return {
      message: "APIのリクエスト制限に達しました。1分ほど待ってから再試行してください。",
      status: 429,
    };
  }

  if (code === 503 || msg.includes("overloaded") || msg.includes("unavailable")) {
    return {
      message: "現在AIサーバーが混み合っています。少し待ってから再試行してください。",
      status: 503,
    };
  }

  if (code === 400 || msg.includes("INVALID_ARGUMENT")) {
    return {
      message: "入力内容に問題がある可能性があります。内容を確認してもう一度お試しください。",
      status: 400,
    };
  }

  if (msg.includes("API key") || msg.includes("PERMISSION_DENIED")) {
    return {
      message: "APIキーが無効または未設定です。管理者に連絡してください。",
      status: 401,
    };
  }

  return {
    message: "AIの生成中にエラーが発生しました。もう一度お試しください。",
    status: 500,
  };
}

// ==========================================
// プロンプト生成
// ==========================================
function buildPrompt(input: FormInput): string {
  const fields = Object.entries(FORM_FIELD_LABELS)
    .map(([key, label]) => {
      const value = input[key as keyof FormInput];
      if (!value && value !== 0) return null;
      return `【${label}】\n${value}`;
    })
    .filter(Boolean)
    .join("\n\n");

  const lengthMap = { short: "80文字以内の短め", medium: "140文字以内の標準", long: "200文字程度の長め" };
  const emojiMap = { none: "絵文字を一切使わない", few: "絵文字は最小限（1〜2個）", normal: "適度に絵文字を使う", many: "絵文字を積極的に使う" };
  const ctaMap = { soft: "さりげなくCTAを入れる", medium: "明確にCTAを入れる", strong: "強く行動喚起するCTAを入れる" };
  const lengthInstruction = lengthMap[input.outputLength] || lengthMap.medium;
  const emojiInstruction = emojiMap[input.emojiLevel] || emojiMap.normal;
  const ctaInstruction = ctaMap[input.ctaStrength] || ctaMap.medium;
  const hashtagNum = input.hashtagCount || 5;
  const aspectRatio = input.imageAspectRatio || "1:1";
  const additionalNg = input.additionalNgWords ? `\n- 追加NG表現: ${input.additionalNgWords}` : "";
  const advancedNote = input.advancedInstruction ? `\n\n## 追加指示\n${input.advancedInstruction}` : "";

  return `あなたはSNSマーケティングの専門家です。以下の情報をもとに、X（Twitter）投稿コンテンツを生成してください。

## 入力情報
${fields}${advancedNote}

## 出力指示
以下の4種類のコンテンツを**必ずJSON形式のみ**で返してください。JSON以外のテキスト（説明文やマークダウン）は一切含めないでください。

### 1. X投稿本文（xPosts）
- 3パターン生成（「王道」「共感重視」「訴求強め」）
- 各投稿は${lengthInstruction}
- ハッシュタグを${hashtagNum}個付与
- ${emojiInstruction}
- ${ctaInstruction}
- NG表現があれば絶対に使わない${additionalNg}

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
- aspectRatio: "${aspectRatio}"

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

// ==========================================
// JSONパース
// ==========================================
function extractJSON(text: string): string {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  return text.trim();
}

// ==========================================
// API ハンドラ
// ==========================================
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
    const prompt = buildPrompt(input);

    // Try primary model with retries, then fallback
    let text: string;
    try {
      const primaryModel = genAI.getGenerativeModel({ model: PRIMARY_MODEL });
      text = await generateWithRetry(primaryModel, prompt);
    } catch (primaryError) {
      console.warn(
        `[Gemini] Primary model (${PRIMARY_MODEL}) failed after retries. Trying fallback (${FALLBACK_MODEL})...`
      );

      try {
        const fallbackModel = genAI.getGenerativeModel({ model: FALLBACK_MODEL });
        text = await generateWithRetry(fallbackModel, prompt, 1);
      } catch (fallbackError) {
        console.error("[Gemini] Fallback model also failed:", fallbackError);
        // Return user-friendly error from the primary error
        const friendly = toUserFriendlyError(primaryError);
        return NextResponse.json({ error: friendly.message }, { status: friendly.status });
      }
    }

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
    const friendly = toUserFriendlyError(error);
    return NextResponse.json({ error: friendly.message }, { status: friendly.status });
  }
}
