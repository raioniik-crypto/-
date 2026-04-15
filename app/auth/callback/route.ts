import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";
  const redirectUrl = new URL(next, requestUrl.origin);

  if (!code) {
    redirectUrl.searchParams.set("auth_status", "error");
    redirectUrl.searchParams.set(
      "auth_message",
      "確認リンクが無効です。もう一度メールをご確認ください。"
    );
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const supabase = createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      throw error;
    }

    redirectUrl.searchParams.set("auth_status", "success");
    redirectUrl.searchParams.set(
      "auth_message",
      "メール確認が完了しました。ログインできます。"
    );
    return NextResponse.redirect(redirectUrl);
  } catch {
    redirectUrl.searchParams.set("auth_status", "error");
    redirectUrl.searchParams.set(
      "auth_message",
      "メール確認に失敗しました。リンクの期限切れ、またはすでに使用済みの可能性があります。"
    );
    return NextResponse.redirect(redirectUrl);
  }
}