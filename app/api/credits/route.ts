import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getBalance } from "@/lib/credits";

export async function GET() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未ログインです" }, { status: 401 });
  }

  const balance = await getBalance(user.id);
  return NextResponse.json({ balance });
}
