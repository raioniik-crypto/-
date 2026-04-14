import { FormInput, INITIAL_FORM } from "@/app/types";

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
// テンプレート定義 + 入力データ
// ==========================================
export interface InputTemplate {
  id: string;
  label: string;
  description: string;
  icon: "package" | "megaphone" | "gift" | "book-open";
  data: FormInput;
}

export const INPUT_TEMPLATES: InputTemplate[] = [
  {
    id: "product",
    label: "商品紹介",
    description: "商品・サービスの魅力を伝える",
    icon: "package",
    data: {
      ...INITIAL_FORM,
      productName: "オーガニック美容オイル「ナチュラグロウ」",
      overview: "天然由来成分100%の美容オイル。顔・体・髪にマルチに使えるオールインワン設計",
      target: "30〜40代の美容意識が高い女性、ナチュラル志向のママ層",
      targetPain: "スキンケアアイテムが多すぎて管理が面倒、成分が気になるが何を選べばいいか分からない",
      benefit: "1本で全身ケアが完結。朝の準備時間を半分に短縮しながら、しっかり保湿",
      strength: "国産オーガニック認証取得、無添加・無香料、定期便なら初回50%OFF",
      proof: "累計販売数5万本突破、美容雑誌3誌で掲載、口コミ評価4.8/5.0",
      announcement: "新商品発売！今なら初回限定トライアルセットあり",
      cta: "プロフィールのリンクから購入ページへ",
      tone: "上品でやさしい、でも説得力がある",
      purpose: "商品認知＋購入促進",
      keywords: "オーガニック, 時短美容, オールインワン, 天然由来",
      ngExpressions: "「絶対効く」「医薬品」等の薬機法抵触表現",
      reference: "ナチュラルコスメ系アカウントの写真映えする投稿",
      imageDirection: "ミニマル",
      carouselSlides: 5,
      additionalNotes: "",
    },
  },
  {
    id: "service",
    label: "サービス訴求",
    description: "サービスの価値を訴求する",
    icon: "megaphone",
    data: {
      ...INITIAL_FORM,
      productName: "Instagram運用代行サービス「プロ・コネクト」",
      overview: "小規模事業者向けに、投稿作成の負担を減らし、集客導線を整える一気通貫サービス",
      target: "SNS運用に手が回らないひとり社長、地方の店舗オーナー",
      targetPain: "毎日投稿が続かない、デザインが素人っぽい、フォロワーは増えるが集客に繋がらない",
      benefit: "企画から画像制作、分析まで丸投げ可能。本業に集中できる時間を創出します",
      strength: "現役マーケターが戦略を設計。AIとプロのデザイナーの掛け合わせで高品質・低価格を実現",
      proof: "累計100アカウント以上の支援実績。導入後3ヶ月で問い合わせ数3倍の実績あり",
      announcement: "本日募集開始！初回限定でアカウント無料診断を実施中",
      cta: "プロフィール欄のリンクから無料相談を予約",
      tone: "論理的かつ親しみやすい",
      purpose: "認知拡大・問い合わせ獲得",
      keywords: "時短, 集客最大化, デザイン外注, SNS戦略",
      ngExpressions: "「絶対稼げる」などの誇大広告、専門用語の多用",
      reference: "ミニマルで清潔感のあるビジネス系アカウント",
      imageDirection: "ミニマル",
      carouselSlides: 7,
      additionalNotes: "初回限定の診断キャンペーンについても触れたい",
    },
  },
  {
    id: "campaign",
    label: "キャンペーン告知",
    description: "期間限定の告知・募集",
    icon: "gift",
    data: {
      ...INITIAL_FORM,
      productName: "夏のフォロー＆RTキャンペーン",
      overview: "フォロー＆リポストで豪華賞品が当たるキャンペーン。ブランド認知とフォロワー獲得が目的",
      target: "20〜30代のSNSアクティブ層、懸賞・プレゼント企画好き",
      targetPain: "お得な情報を見逃したくない、気軽に参加できるキャンペーンを探している",
      benefit: "フォロー＆リポストだけで応募完了。抽選で10名に人気商品をプレゼント",
      strength: "応募が超簡単（2タップ）、当選確率が高い、話題の商品が賞品",
      proof: "前回キャンペーンは参加者3,000名以上、フォロワー800名増加",
      announcement: "7/1〜7/31限定！夏のフォロー＆RTキャンペーン開催",
      cta: "今すぐこの投稿をリポスト＆フォロー！",
      tone: "テンション高め、お祭り感、ポップ",
      purpose: "フォロワー獲得＋ブランド認知",
      keywords: "プレゼント, キャンペーン, 限定, 抽選, 当たる",
      ngExpressions: "景品表示法に抵触する表現、当選確約表現",
      reference: "人気ブランドのRT企画投稿",
      imageDirection: "ポップ",
      carouselSlides: 3,
      additionalNotes: "キャンペーン規約のURLも添えたい",
    },
  },
  {
    id: "education",
    label: "カルーセル教育系",
    description: "知識共有・ノウハウ系",
    icon: "book-open",
    data: {
      ...INITIAL_FORM,
      productName: "SNS運用の基本5ステップ",
      overview: "SNS初心者向けに、運用の基本を5ステップで解説するカルーセル投稿",
      target: "SNS運用を始めたい個人事業主、副業ワーカー、マーケ初心者",
      targetPain: "何から始めればいいか分からない、投稿しても反応がない、戦略の立て方が分からない",
      benefit: "この5ステップを実践するだけで、SNS運用の基盤が整う。保存して何度でも見返せる",
      strength: "現役マーケターが実践で得たノウハウを凝縮、初心者でもすぐ実行できる具体的なアクション付き",
      proof: "この方法で50アカウント以上を支援、平均エンゲージメント率2倍向上",
      announcement: "保存推奨！SNS運用の教科書カルーセル",
      cta: "保存して後で見返してね！もっと詳しく知りたい方はプロフのリンクへ",
      tone: "先生っぽいが堅すぎない、図解向けのシンプルな文体",
      purpose: "権威性構築＋保存数獲得＋フォロワー育成",
      keywords: "SNS運用, 初心者向け, ステップ, ノウハウ, 保存推奨",
      ngExpressions: "専門用語の多用、マウンティング感のある表現",
      reference: "図解系インフルエンサーの教育カルーセル",
      imageDirection: "イラスト",
      carouselSlides: 7,
      additionalNotes: "各スライドに具体的なアクションを1つずつ入れたい",
    },
  },
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
  adjusting: "微調整してるよ...ちょっと待ってね！",
  adjusted: "調整したよ！いい感じになったかな？",
  templateApplied: "テンプレートを入れたよ！中身を確認してね！",
};
