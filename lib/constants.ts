// ==========================================
// 制作者情報
// ==========================================
export const CREATOR = {
  name: "いさむ",
  tagline: "AI×ライティング×開発",
  xHandle: "@isamu_freelance",
  links: [
    { label: "@isamu_freelance", url: "https://x.com/isamu_freelance", icon: "twitter" as const },
    { label: "ポートフォリオ", url: "https://isamu-portfolio.vercel.app", icon: "external" as const },
  ],
};

// ==========================================
// 外部アクションURL
// ==========================================
export const EXTERNAL_URLS = {
  xPostIntent: "https://x.com/intent/post",
  canvaHome: "https://www.canva.com/",
  geminiHome: "https://aistudio.google.com/",
};

/**
 * X投稿画面を開くURLを生成
 * テキストをURLエンコードして渡す
 */
export function buildXPostUrl(text: string): string {
  return `${EXTERNAL_URLS.xPostIntent}?text=${encodeURIComponent(text)}`;
}

// ==========================================
// ハッシュタグ設定
// ==========================================
export const HASHTAG_MAX_COUNT = 10;

// ==========================================
// 調整チップ定義
// ==========================================
export const ADJUST_CHIPS = [
  { label: "短く", prompt: "もっと短く簡潔にしてください" },
  { label: "強めに", prompt: "もっと訴求力を強めてください" },
  { label: "やさしく", prompt: "もっとやさしく親しみやすいトーンにしてください" },
  { label: "論理的に", prompt: "もっと論理的で説得力のある文体にしてください" },
  { label: "キャッチーに", prompt: "もっとキャッチーで目を引く表現にしてください" },
] as const;

// ==========================================
// テンプレート定義（将来拡張用）
// ==========================================
export interface InputTemplate {
  id: string;
  label: string;
  description: string;
  icon: "package" | "megaphone" | "gift" | "book-open";
}

export const INPUT_TEMPLATES: InputTemplate[] = [
  { id: "product", label: "商品紹介", description: "商品・サービスの魅力を伝える", icon: "package" },
  { id: "service", label: "サービス訴求", description: "サービスの価値を訴求する", icon: "megaphone" },
  { id: "campaign", label: "キャンペーン告知", description: "期間限定の告知・募集", icon: "gift" },
  { id: "education", label: "カルーセル教育系", description: "知識共有・ノウハウ系", icon: "book-open" },
];

// ==========================================
// マスコットメッセージ
// ==========================================
export const MASCOT_MESSAGES = {
  idle: "こんにちは！私が投稿作成をお手伝いするよ！情報を入力してね",
  generating: "がんばって生成してるよ...少し待っててね！",
  success: "できたよ！コピーしてすぐ使ってね！",
  error: "うまくいかなかった...もう一度試してみて！",
  copy: "コピーしたよ！そのまま貼り付けて使ってね！",
};
