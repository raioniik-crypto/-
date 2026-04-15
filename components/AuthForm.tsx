"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Mail,
  Lock,
  LogIn,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface AuthFormProps {
  onSuccess: () => void;
  onToast: (
    message: string,
    type?: "success" | "error" | "info",
    duration?: number
  ) => void;
}

function normalizeAuthError(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials")) {
    return "メールアドレスまたはパスワードが違います。";
  }

  if (lower.includes("email not confirmed")) {
    return "メール確認がまだ完了していません。確認メールのリンクを開いてください。";
  }

  if (lower.includes("user already registered")) {
    return "このメールアドレスはすでに登録されています。ログインをお試しください。";
  }

  if (lower.includes("password should be at least")) {
    return "パスワードは6文字以上で入力してください。";
  }

  if (lower.includes("unable to validate email address")) {
    return "メールアドレスの形式が正しくありません。";
  }

  if (lower.includes("signup is disabled")) {
    return "現在、新規登録は利用できません。";
  }

  if (lower.includes("network")) {
    return "通信エラーが発生しました。ネット接続を確認してもう一度お試しください。";
  }

  return "ログインまたは新規登録に失敗しました。入力内容を確認してもう一度お試しください。";
}

function toHalfWidth(value: string) {
  return value
    .replace(/[！-～]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0xfee0)
    )
    .replace(/　/g, " ");
}

export default function AuthForm({
  onSuccess,
}: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setFormError(null);
    setFormSuccess(null);

    const safeEmail = toHalfWidth(email).trim().toLowerCase();
    const safePassword = toHalfWidth(password).trim();

    if (!safeEmail) {
      setFormError("メールアドレスを入力してください。");
      return;
    }

    if (!safePassword) {
      setFormError("パスワードを入力してください。");
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: safeEmail,
          password: safePassword,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;

        setFormSuccess(
          "確認メールを送信しました。メールを開いて本人確認を完了してください。"
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: safeEmail,
          password: safePassword,
        });

        if (error) throw error;

        setFormSuccess("ログインしました。");
        onSuccess();
      }
    } catch (err) {
      const rawMessage =
        err instanceof Error ? err.message : "Unknown auth error";
      setFormError(normalizeAuthError(rawMessage));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {(formError || formSuccess) && (
        <div className="space-y-3">
          {formError && (
            <div className="rounded-2xl border-2 border-red-600 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 flex items-start gap-2">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="rounded-2xl border-2 border-emerald-600 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 flex items-start gap-2">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-xs font-black text-black flex items-center gap-1">
          <Mail size={14} />
          メールアドレス
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(toHalfWidth(e.target.value))}
          placeholder="you@example.com"
          className={`w-full px-4 py-3 rounded-xl border-2 outline-none font-bold text-sm ${
            formError
              ? "border-red-500 bg-red-50"
              : "border-black focus:bg-yellow-50"
          }`}
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="email"
          required
        />
        <p className="text-[11px] font-bold text-slate-500">
          全角で入力しても、自動で半角に寄せます。
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-black text-black flex items-center gap-1">
          <Lock size={14} />
          パスワード
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(toHalfWidth(e.target.value))}
          placeholder="6文字以上"
          className={`w-full px-4 py-3 rounded-xl border-2 outline-none font-bold text-sm ${
            formError
              ? "border-red-500 bg-red-50"
              : "border-black focus:bg-yellow-50"
          }`}
          minLength={6}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          lang="en"
          inputMode="text"
          required
        />
        <p className="text-[11px] font-bold text-slate-500">
          パスワードは全角入力でも、自動で半角に寄せて送信します。
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-pink-500 disabled:bg-pink-300 text-white font-black rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-2"
      >
        <LogIn size={18} />
        {loading ? "送信中..." : isSignUp ? "新規登録" : "ログイン"}
      </button>

      <button
        type="button"
        onClick={() => {
          setIsSignUp(!isSignUp);
          setFormError(null);
          setFormSuccess(null);
        }}
        className="w-full text-xs font-black text-indigo-600 hover:underline"
      >
        {isSignUp
          ? "すでにアカウントをお持ちの方はこちら"
          : "新規登録はこちら"}
      </button>
    </form>
  );
}