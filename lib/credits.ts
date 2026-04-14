import { createServiceSupabase } from "@/lib/supabase/server";

/**
 * ユーザーの現在のクレジット残高を取得
 */
export async function getBalance(userId: string): Promise<number> {
  const supabase = createServiceSupabase();
  const { data, error } = await supabase
    .from("credit_wallets")
    .select("balance")
    .eq("user_id", userId)
    .single();

  if (error || !data) return 0;
  return data.balance;
}

/**
 * クレジットを消費する（残高不足なら false を返す）
 * トランザクション: wallet 更新 → ledger 記録 → usage_log 記録
 */
export async function consumeCredits(
  userId: string,
  cost: number,
  reason: string,
  requestId?: string
): Promise<{ success: boolean; balance: number }> {
  const supabase = createServiceSupabase();

  // RPC でアトミックに減算（balance >= 0 制約で自動ガード）
  const { data, error } = await supabase.rpc("consume_credits", {
    p_user_id: userId,
    p_cost: cost,
    p_reason: reason,
    p_ref_id: requestId || null,
  });

  if (error) {
    // balance不足の場合は check constraint violation
    if (error.message?.includes("check") || error.message?.includes("violates")) {
      const balance = await getBalance(userId);
      return { success: false, balance };
    }
    console.error("consumeCredits error:", error);
    return { success: false, balance: 0 };
  }

  return { success: true, balance: data ?? 0 };
}

/**
 * クレジットを加算する（購入・ボーナスなど）
 */
export async function addCredits(
  userId: string,
  amount: number,
  reason: string,
  refId?: string
): Promise<{ success: boolean; balance: number }> {
  const supabase = createServiceSupabase();

  const { data, error } = await supabase.rpc("add_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
    p_ref_id: refId || null,
  });

  if (error) {
    console.error("addCredits error:", error);
    return { success: false, balance: 0 };
  }

  return { success: true, balance: data ?? 0 };
}
