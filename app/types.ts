// ==========================================
// 入力フォームの型定義
// ==========================================
export interface FormInput {
  productName: string;
  overview: string;
  target: string;
  targetPain: string;
  benefit: string;
  strength: string;
  proof: string;
  announcement: string;
  cta: string;
  tone: string;
  purpose: string;
  keywords: string;
  ngExpressions: string;
  reference: string;
  imageDirection: string;
  carouselSlides: number;
  additionalNotes: string;
}

export const FORM_FIELD_LABELS: Record<keyof FormInput, string> = {
  productName: "商品名 / サービス名 / 企画名",
  overview: "概要",
  target: "ターゲット",
  targetPain: "ターゲットの悩み",
  benefit: "提供価値・ベネフィット",
  strength: "強み・差別化ポイント",
  proof: "実績・根拠・信頼材料",
  announcement: "告知内容",
  cta: "CTA（行動喚起）",
  tone: "トンマナ / 文体",
  purpose: "投稿の目的",
  keywords: "入れたいキーワード",
  ngExpressions: "NG表現",
  reference: "参考投稿や雰囲気メモ",
  imageDirection: "画像の方向性",
  carouselSlides: "カルーセル枚数",
  additionalNotes: "追加メモ",
};

export const FORM_PLACEHOLDERS: Record<keyof FormInput, string> = {
  productName: "例：Instagram運用代行サービス「プロ・コネクト」",
  overview: "例：AIがX投稿・カルーセル・画像プロンプトを自動生成するSaaSツール",
  target: "例：SNS運用担当者、個人事業主、マーケター",
  targetPain: "例：毎回投稿を考えるのが大変、デザインのネタが尽きる",
  benefit: "例：投稿作成時間を1/10に短縮、プロ品質のコンテンツを量産",
  strength: "例：日本語特化、業界別テンプレート、Canva連携",
  proof: "例：導入企業300社、投稿エンゲージメント平均2.5倍向上",
  announcement: "例：本日リリース！初月無料キャンペーン実施中",
  cta: "例：プロフィールのリンクから無料登録",
  tone: "例：親しみやすいが専門性も感じる、敬語ベース",
  purpose: "例：認知拡大、リード獲得、フォロワー増加",
  keywords: "例：AI, SNS運用, 時短, 自動化",
  ngExpressions: "例：「絶対」「確実」「No.1」（根拠なし表現）",
  reference: "例：@xxxの投稿のようなカジュアルだけど情報量のある感じ",
  imageDirection: "例：クリーンでモダン、青系グラデーション、テック感",
  carouselSlides: "",
  additionalNotes: "例：来週の月曜に投稿予定、ハッシュタグは5個以内",
};

// ==========================================
// Gemini レスポンスの型定義
// ==========================================
export interface XPost {
  label: string;
  body: string;
  hashtags: string[];
}

export interface CarouselSlide {
  slideNumber: number;
  title: string;
  subtitle: string;
  body: string;
}

export interface ImagePrompt {
  label: string;
  mainPrompt: string;
  mainPromptJa: string;
  subPrompt: string;
  negativePrompt: string;
  aspectRatio: string;
}

export interface CanvaTexts {
  coverTitles: string[];
  subTitles: string[];
  highlightWords: string[];
  descriptions: string[];
  ctaTexts: string[];
  badgeShortTexts: string[];
}

export interface GenerateResult {
  xPosts: XPost[];
  carousel: CarouselSlide[];
  imagePrompts: ImagePrompt[];
  canvaTexts: CanvaTexts;
}

// ==========================================
// UI状態
// ==========================================
export type OutputTab = "xPosts" | "carousel" | "imagePrompts" | "canvaTexts";

export const OUTPUT_TAB_LABELS: Record<OutputTab, string> = {
  xPosts: "X投稿本文",
  carousel: "カルーセル",
  imagePrompts: "画像プロンプト",
  canvaTexts: "Canva用文字",
};

export const INITIAL_FORM: FormInput = {
  productName: "",
  overview: "",
  target: "",
  targetPain: "",
  benefit: "",
  strength: "",
  proof: "",
  announcement: "",
  cta: "",
  tone: "",
  purpose: "",
  keywords: "",
  ngExpressions: "",
  reference: "",
  imageDirection: "",
  carouselSlides: 5,
  additionalNotes: "",
};
