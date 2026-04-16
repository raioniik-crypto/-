"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  RefreshCw,
  CheckCircle2,
  ChevronRight,
  Info,
  Settings,
  Save,
  Layers,
  ExternalLink,
} from "lucide-react";
import Mascot from "@/components/Mascot";
import InputForm from "@/components/InputForm";
import OutputPanel from "@/components/OutputPanel";
import Toast from "@/components/Toast";
import ResetConfirmModal from "@/components/ResetConfirmModal";
import TemplateModal from "@/components/TemplateModal";
import SettingsModal from "@/components/SettingsModal";
import { FormInput, GenerateResult, INITIAL_FORM, AdjustTarget } from "./types";
import { CREATOR, MASCOT_MESSAGES } from "@/lib/constants";

// X (Twitter) logo SVG — lucide's "X" icon is a close/cross icon, not the Twitter logo
function XLogoIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

type AppStatus = "input" | "generating" | "output";

const STORAGE_KEY = "sns-content-generator-draft";

/**
 * Sanitize raw error messages so "Failed to fetch", "TypeError", etc.
 * are never shown directly to the user.
 */
function friendlyErrorMessage(e: unknown, fallback: string): string {
  if (!(e instanceof Error)) return fallback;
  const msg = e.message;
  // Network-level failures surfaced by the browser Fetch API
  if (
    msg === "Failed to fetch" ||
    msg.includes("NetworkError") ||
    msg.includes("network") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("abort")
  ) {
    return "通信エラーが発生しました。ネットワーク接続を確認してもう一度お試しください。";
  }
  // Already a Japanese user-facing message from our API
  return msg;
}

// --- Sub-components ---

function Header({
  onOpenTemplates,
  onOpenSettings,
}: {
  onOpenTemplates: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <header className="border-b-4 border-black bg-yellow-400 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Mascot size="sm" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 border-2 border-black rounded-full animate-ping" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-black tracking-tight">
              SNS投稿生成アシスタント
            </h1>
            <p className="text-xs font-bold text-black/70 hidden sm:block">
              爆速でバズるコンテンツをまとめて作成！
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenTemplates}
            className="hidden md:flex items-center gap-1.5 px-4 py-2 bg-white border-2 border-black rounded-xl font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
          >
            <Layers size={16} />
            テンプレート
          </button>
          <button
            onClick={onOpenTemplates}
            className="hidden md:flex items-center gap-1.5 px-4 py-2 bg-white border-2 border-black rounded-xl font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
          >
            <Save size={16} />
            保存
          </button>
          <button
            onClick={onOpenSettings}
            className="p-2 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}

function ProgressBar({ status }: { status: AppStatus }) {
  const steps = [
    { id: "input", label: "入力", icon: FileText },
    { id: "generating", label: "生成", icon: RefreshCw },
    { id: "output", label: "完了", icon: CheckCircle2 },
  ] as const;

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <div className="relative flex justify-between">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-black -translate-y-1/2 z-0" />
        {steps.map((step) => {
          const isActive = status === step.id;
          const isCompleted =
            (status === "generating" && step.id === "input") ||
            (status === "output" && step.id !== "output");
          const Icon = step.icon;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center gap-3">
              <div
                className={`w-14 h-14 rounded-2xl border-4 border-black flex items-center justify-center transition-all duration-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                  isActive
                    ? "bg-pink-500 text-white scale-110"
                    : isCompleted
                    ? "bg-cyan-400 text-black"
                    : "bg-white text-black"
                }`}
              >
                <Icon
                  size={24}
                  className={isActive && step.id === "generating" ? "animate-spin" : ""}
                />
              </div>
              <span
                className={`text-sm font-black uppercase tracking-tighter ${
                  isActive ? "text-pink-600" : "text-black"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UsageGuide({ mascotMessage }: { mascotMessage: string }) {
  return (
    <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
      <Mascot message={mascotMessage} />
      <div className="flex-1 bg-cyan-100 border-4 border-black rounded-2xl p-6 flex flex-wrap gap-6 items-center justify-center text-sm font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-pink-500 border-2 border-black text-white flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            1
          </span>
          <span>情報をコピペ！</span>
        </div>
        <ChevronRight size={20} className="text-black hidden sm:block" />
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-indigo-500 border-2 border-black text-white flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            2
          </span>
          <span>ボタンをポチッ！</span>
        </div>
        <ChevronRight size={20} className="text-black hidden sm:block" />
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-yellow-400 border-2 border-black text-black flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            3
          </span>
          <span>コピーして投稿！</span>
        </div>
      </div>
    </div>
  );
}

function NoticeBox() {
  return (
    <div className="bg-yellow-100 border-4 border-black rounded-3xl p-5 flex gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="w-10 h-10 bg-yellow-400 border-2 border-black rounded-full flex items-center justify-center shrink-0">
        <Info size={20} className="text-black" />
      </div>
      <div className="text-xs text-black leading-relaxed font-bold">
        <p className="text-sm font-black mb-1">ご利用上の注意</p>
        <p>
          生成結果はAIによる提案です。必ず内容を調整・確認した上で投稿してください。特に実績や数値、規約に抵触する表現がないか最終チェックをお願いします。
        </p>
      </div>
    </div>
  );
}

function CreatorCard() {
  return (
    <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group">
      <div className="absolute -top-6 -right-6 w-24 h-24 bg-pink-500/10 rounded-full group-hover:scale-150 transition-transform duration-700" />
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Mascot size="sm" className="shrink-0" />
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Created by
            </p>
            <h3 className="font-black text-lg leading-tight">{CREATOR.name}</h3>
            <p className="text-pink-600 font-black text-xs">{CREATOR.tagline}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <a
            href={CREATOR.links[0].url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 h-11 bg-black text-white border-2 border-black rounded-xl font-black text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
          >
            <XLogoIcon size={14} />
            {CREATOR.xHandle}
          </a>
          <a
            href={CREATOR.links[1].url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 h-11 bg-indigo-500 text-white border-2 border-black rounded-xl font-black text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
          >
            <ExternalLink size={14} />
            ポートフォリオ
          </a>
        </div>
      </div>
    </div>
  );
}

// --- Main Page ---

export default function Home() {
  const [form, setForm] = useState<FormInput>(INITIAL_FORM);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [status, setStatus] = useState<AppStatus>("input");
  const [error, setError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({
    visible: false,
    message: "",
    type: "success",
  });
  const [hydrated, setHydrated] = useState(false);
  const [mascotMessage, setMascotMessage] = useState(MASCOT_MESSAGES.idle);
  const [adjusting, setAdjusting] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [urgentPurchase, setUrgentPurchase] = useState(false);
  const [creditRefreshSignal, setCreditRefreshSignal] = useState(0);

  const showToast = useCallback(
    (
      message: string,
      type: "success" | "error" | "info" = "success",
      duration = 4000
    ) => {
      setToast({ visible: true, message, type });
      setTimeout(() => {
        setToast({ visible: false, message: "", type: "success" });
      }, duration);
    },
    []
  );

  // Detect auth callback return (email confirmation success/failure)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get("auth_status");
    const authMessage = params.get("auth_message");

    if (!authStatus || !authMessage) return;

    showToast(
      authMessage,
      authStatus === "success" ? "success" : "error",
      5000
    );

    if (authStatus === "success") {
      // Confirmed email -> user is now logged in; refresh credits shown in UI
      setMascotMessage("メール確認が完了したよ！");
      setCreditRefreshSignal((n) => n + 1);
    } else {
      // Expired/used link etc. -> prompt re-login via settings modal
      setMascotMessage("うまくいかなかった...もう一度ログインしてみてね！");
      setShowSettingsModal(true);
    }

    window.history.replaceState({}, "", window.location.pathname);
  }, [showToast]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setForm(JSON.parse(saved) as FormInput);
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {
      // ignore
    }
  }, [form, hydrated]);

  // Detect Stripe Checkout return query (?payment=success / cancelled)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (!payment) return;

    if (payment === "success") {
      showToast("決済が完了しました！クレジットを反映しています...");
      setMascotMessage("購入ありがとう！クレジットを追加したよ！");
      // Open settings modal to show updated balance
      setShowSettingsModal(true);
      // Bump refresh signal so SettingsModal re-fetches balance
      // Webhook processing may be slightly delayed, so retry a few times
      setCreditRefreshSignal((n) => n + 1);
      const retryTimers = [1500, 3500, 6000].map((delay) =>
        setTimeout(() => setCreditRefreshSignal((n) => n + 1), delay)
      );
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
      return () => {
        retryTimers.forEach(clearTimeout);
      };
    }

    if (payment === "cancelled") {
      showToast("決済をキャンセルしました");
      setMascotMessage("決済はキャンセルされたよ。またいつでもどうぞ！");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [showToast]);

  const handleGenerate = useCallback(async () => {
    setStatus("generating");
    setError(null);
    setResult(null);
    setMascotMessage(MASCOT_MESSAGES.generating);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        // クレジット不足・未ログインは設定モーダルで対応できるよう自動で開く
        if (data?.insufficientCredits || data?.requireAuth) {
          setUrgentPurchase(!!data.insufficientCredits);
          setShowSettingsModal(true);
        }
        throw new Error(data.error || "生成に失敗しました。");
      }

      setResult(data as GenerateResult);
      setStatus("output");
      setMascotMessage(MASCOT_MESSAGES.success);
      setCreditRefreshSignal((n) => n + 1);
      showToast("コンテンツを生成しました");
    } catch (e) {
      setError(
        friendlyErrorMessage(e, "不明なエラーが発生しました。もう一度お試しください。")
      );
      setStatus("input");
      setMascotMessage(MASCOT_MESSAGES.error);
    }
  }, [form, showToast]);

  const handleResetConfirm = () => {
    setForm(INITIAL_FORM);
    setResult(null);
    setError(null);
    setStatus("input");
    setShowResetConfirm(false);
    setMascotMessage(MASCOT_MESSAGES.idle);
    showToast("入力をリセットしました");
  };

  const handleCopy = useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text);
      setMascotMessage(MASCOT_MESSAGES.copy);
      showToast("コピーしました！");
      setTimeout(() => {
        setMascotMessage((prev) =>
          prev === MASCOT_MESSAGES.copy
            ? status === "output"
              ? MASCOT_MESSAGES.success
              : MASCOT_MESSAGES.idle
            : prev
        );
      }, 3000);
    },
    [showToast, status]
  );

  const handleAdjust = useCallback(
    async (target: AdjustTarget, instruction: string) => {
      if (!result) return;
      setAdjusting(true);
      setMascotMessage(MASCOT_MESSAGES.adjusting);

      try {
        const currentContent = result[target];
        const res = await fetch("/api/adjust", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target, currentContent, instruction }),
        });

        const data = await res.json();
        if (!res.ok) {
          if (data?.insufficientCredits || data?.requireAuth) {
            setShowSettingsModal(true);
          }
          throw new Error(data.error || "調整に失敗しました。");
        }

        setResult((prev) => {
          if (!prev) return prev;
          return { ...prev, [target]: data.data };
        });
        setMascotMessage(MASCOT_MESSAGES.adjusted);
        setCreditRefreshSignal((n) => n + 1);
        showToast("調整しました！");
      } catch (e) {
        showToast(
          friendlyErrorMessage(e, "調整中にエラーが発生しました。"),
          "error"
        );
        setMascotMessage(MASCOT_MESSAGES.error);
      } finally {
        setAdjusting(false);
      }
    },
    [result, showToast]
  );

  const handleTemplateToast = useCallback(
    (message: string) => {
      showToast(message);
      setMascotMessage(MASCOT_MESSAGES.templateApplied);
      setTimeout(() => {
        setMascotMessage((prev) =>
          prev === MASCOT_MESSAGES.templateApplied ? MASCOT_MESSAGES.idle : prev
        );
      }, 3000);
    },
    [showToast]
  );

  return (
    <div className="min-h-screen font-sans text-slate-900 pb-32 bg-slate-50">
      <Header
        onOpenTemplates={() => setShowTemplateModal(true)}
        onOpenSettings={() => {
          setUrgentPurchase(false);
          setShowSettingsModal(true);
        }}
      />

      <main className="max-w-7xl mx-auto px-4 pt-4">
        <ProgressBar status={status} />
        <UsageGuide mascotMessage={mascotMessage} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-6">
            <InputForm
              form={form}
              onChange={setForm}
              onSubmit={handleGenerate}
              onResetClick={() => setShowResetConfirm(true)}
              loading={status === "generating"}
              onToast={handleTemplateToast}
            />
            <NoticeBox />
            <CreatorCard />
          </div>

          <div className="lg:col-span-7 space-y-6">
            <OutputPanel
              result={result}
              loading={status === "generating"}
              error={error}
              onRetry={handleGenerate}
              onCopy={handleCopy}
              onAdjust={handleAdjust}
              adjusting={adjusting}
            />
          </div>
        </div>
      </main>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} />

      <ResetConfirmModal
        isOpen={showResetConfirm}
        onCancel={() => setShowResetConfirm(false)}
        onConfirm={handleResetConfirm}
      />

      <TemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        currentForm={form}
        onApply={(data) => {
          setForm(data);
          setMascotMessage(MASCOT_MESSAGES.templateApplied);
        }}
        onToast={showToast}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => {
          setShowSettingsModal(false);
          setUrgentPurchase(false);
        }}
        onToast={showToast}
        onAuthChange={() => {
          setCreditRefreshSignal((n) => n + 1);
        }}
        refreshSignal={creditRefreshSignal}
        urgentPurchase={urgentPurchase}
      />

      <footer className="fixed bottom-0 left-0 w-full bg-white border-t-4 border-black py-4 px-6 z-40 shadow-[0_-4px_0_0_rgba(0,0,0,1)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-[10px] font-black">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-cyan-400 border border-black animate-pulse" />
              SYSTEM ONLINE
            </span>
            <span className="bg-yellow-400 px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
              VERSION 1.0.0-POP
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              by {CREATOR.name}
            </span>
            <a
              href={CREATOR.links[0].url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
            >
              <XLogoIcon size={12} />
            </a>
            <span className="text-[9px] font-black text-slate-400">
              Powered by Gemini API
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}