import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Supabase email confirmation / OAuth callback handler.
 *
 * Supports two Supabase email-link variants:
 *   1. PKCE flow: /auth/callback?code=xxx
 *   2. Email OTP flow: /auth/callback?token_hash=xxx&type=signup|email|recovery|...
 *
 * Critical implementation note:
 *   The session cookies must be attached to the SAME NextResponse that we
 *   return. Using `cookies()` from `next/headers` with a later
 *   `NextResponse.redirect()` creates a fresh response without the cookies,
 *   which is why previously a successful email confirmation could appear
 *   as still-unauthenticated on return.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";
  const supabaseError = searchParams.get("error");
  const supabaseErrorDesc = searchParams.get("error_description");

  const buildRedirect = (
    path: string,
    params?: Record<string, string>
  ) => {
    const target = path.startsWith("http") ? new URL(path) : new URL(path, origin);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        target.searchParams.set(k, v);
      }
    }
    return NextResponse.redirect(target);
  };

  const friendlyError = (fallback: string) =>
    buildRedirect(next, {
      auth_status: "error",
      auth_message: supabaseErrorDesc || fallback,
    });

  // Supabase itself redirected here with an error (e.g. already-used / expired link)
  if (supabaseError) {
    return friendlyError(
      "メール確認に失敗しました。リンクの期限切れ、またはすでに使用済みの可能性があります。"
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // No Supabase configured — pass through without message
  if (!url || !key) {
    return buildRedirect(next);
  }

  // Prepare the redirect response first so auth cookies can be attached to it.
  const successResponse = buildRedirect(next, {
    auth_status: "success",
    auth_message: "メール確認が完了しました。ログインできます。",
  });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(
          ({
            name,
            value,
            options,
          }: { name: string; value: string; options: CookieOptions }) => {
            successResponse.cookies.set(name, value, options);
          }
        );
      },
    },
  });

  // Entire auth exchange is wrapped in try/catch because exchangeCodeForSession
  // and verifyOtp can THROW (not just return error) on network failures, which
  // would otherwise result in an unhandled 500 showing raw "Failed to fetch".
  try {
    // --- Flow 1: PKCE (code) ---
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
        return friendlyError(
          "メール確認に失敗しました。リンクの期限切れ、またはすでに使用済みの可能性があります。"
        );
      }
      return successResponse;
    }

    // --- Flow 2: Email OTP (token_hash + type) ---
    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash: tokenHash,
      });
      if (error) {
        console.error("[auth/callback] verifyOtp failed:", error.message);
        return friendlyError(
          "メール確認に失敗しました。リンクの期限切れ、またはすでに使用済みの可能性があります。"
        );
      }
      return successResponse;
    }
  } catch (err) {
    console.error("[auth/callback] Unexpected error during auth exchange:", err);
    return friendlyError(
      "メール確認の処理中に通信エラーが発生しました。しばらくしてからもう一度お試しください。"
    );
  }

  // Neither code nor token_hash provided — invalid link
  return friendlyError(
    "確認リンクが無効です。もう一度メールをご確認ください。"
  );
}
