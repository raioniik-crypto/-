"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, LogIn } from "lucide-react";

interface AuthFormProps {
  onSuccess: () => void;
  onToast: (message: string) => void;
}

export default function AuthForm({ onSuccess, onToast }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        onToast("確認メールを送信しました。メールを確認してください。");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onToast("ログインしました！");
        onSuccess();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "認証エラーが発生しました";
      onToast(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-black text-black flex items-center gap-1">
          <Mail size={14} />
          メールアドレス
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-4 py-3 rounded-xl border-2 border-black focus:bg-yellow-50 outline-none font-bold text-sm"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-black text-black flex items-center gap-1">
          <Lock size={14} />
          パスワード
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="6文字以上"
          className="w-full px-4 py-3 rounded-xl border-2 border-black focus:bg-yellow-50 outline-none font-bold text-sm"
          minLength={6}
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-pink-500 disabled:bg-pink-300 text-white font-black rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-2"
      >
        <LogIn size={18} />
        {loading ? "処理中..." : isSignUp ? "新規登録" : "ログイン"}
      </button>
      <button
        type="button"
        onClick={() => setIsSignUp(!isSignUp)}
        className="w-full text-xs font-black text-indigo-600 hover:underline"
      >
        {isSignUp ? "すでにアカウントをお持ちの方はこちら" : "新規登録はこちら"}
      </button>
    </form>
  );
}
