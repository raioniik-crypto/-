// ==========================================
// クレジット消費コスト
// ==========================================
export const CREDIT_COSTS = {
  generate: 3,
  adjust: 1,
} as const;

// ==========================================
// 購入プラン
// ==========================================
export interface CreditPlan {
  id: string;
  credits: number;
  price: number;      // JPY
  label: string;
  popular?: boolean;
}

export const CREDIT_PLANS: CreditPlan[] = [
  { id: "plan_10", credits: 10, price: 300, label: "10クレジット" },
  { id: "plan_30", credits: 30, price: 800, label: "30クレジット", popular: true },
  { id: "plan_100", credits: 100, price: 2000, label: "100クレジット" },
];

// ==========================================
// 初回登録ボーナス
// ==========================================
export const SIGNUP_BONUS_CREDITS = 10;

// ==========================================
// 表示用ラベル
// ==========================================
export const ACTION_LABELS: Record<string, string> = {
  generate: "コンテンツ生成",
  adjust: "微調整",
  purchase: "クレジット購入",
  signup_bonus: "初回登録ボーナス",
};
