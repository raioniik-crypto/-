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
  Smile,
  ExternalLink,
  X,
} from "lucide-react";
import Mascot from "@/components/Mascot";
import InputForm from "@/components/InputForm";
import OutputPanel from "@/components/OutputPanel";
import Toast from "@/components/Toast";
import ResetConfirmModal from "@/components/ResetConfirmModal";
import { FormInput, GenerateResult, INITIAL_FORM } from "./types";
import { CREATOR, MASCOT_MESSAGES } from "@/lib/constants";

type AppStatus = "input" | "generating" | "output";

const STORAGE_KEY = "sns-content-generator-draft";

// --- Sub-components ---

function Header() {
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
          <button className="hidden md:flex items-center gap-1.5 px-4 py-2 bg-white border-2 border-black rounded-xl font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all">
            <Layers size={16} />
            テンプレート
          </button>
          <button className="hidden md:flex items-center gap-1.5 px-4 py-2 bg-white border-2 border-black rounded-xl font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all">
            <Save size={16} />
            保存
          </button>
          <button className="p-2 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all">
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
            <h3 className="font-black text-lg leading-tight">CREATED BY</h3>
            <p className="text-pink-600 font-black text-sm">
              {CREATOR.name} | {CREATOR.tagline}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {CREATOR.links.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-center gap-2 py-3 border-2 border-black rounded-xl font-black text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all ${
                link.icon === "x"
                  ? "bg-white hover:bg-cyan-50"
                  : "bg-indigo-500 text-white hover:bg-indigo-600"
              }`}
            >
              {link.icon === "x" ? <X size={16} /> : <ExternalLink size={16} />}
              {link.label}
            </a>
          ))}
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
  const [toast, setToast] = useState({ visible: false, message: "" });
  const [hydrated, setHydrated] = useState(false);
  const [mascotMessage, setMascotMessage] = useState(MASCOT_MESSAGES.idle);

  const showToast = useCallback((message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: "" }), 2000);
  }, []);

  // Restore from localStorage
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

  // Save to localStorage
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {
      // ignore
    }
  }, [form, hydrated]);

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
        throw new Error(data.error || "生成に失敗しました。");
      }

      setResult(data as GenerateResult);
      setStatus("output");
      setMascotMessage(MASCOT_MESSAGES.success);
      showToast("コンテンツを生成しました");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "不明なエラーが発生しました。もう一度お試しください。"
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
      // Revert mascot message after a delay
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

  return (
    <div className="min-h-screen font-sans text-slate-900 pb-32 bg-slate-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 pt-4">
        <ProgressBar status={status} />
        <UsageGuide mascotMessage={mascotMessage} />

        {/* 2 Column Grid: 5:7 matching reference */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Input */}
          <div className="lg:col-span-5 space-y-6">
            <InputForm
              form={form}
              onChange={setForm}
              onSubmit={handleGenerate}
              onResetClick={() => setShowResetConfirm(true)}
              loading={status === "generating"}
              onToast={showToast}
            />
            <NoticeBox />
            <CreatorCard />
          </div>

          {/* Right: Output */}
          <div className="lg:col-span-7 space-y-6">
            <OutputPanel
              result={result}
              loading={status === "generating"}
              error={error}
              onRetry={handleGenerate}
              onCopy={handleCopy}
            />
          </div>
        </div>
      </main>

      {/* Toast */}
      <Toast visible={toast.visible} message={toast.message} />

      {/* Reset Confirm Modal */}
      <ResetConfirmModal
        isOpen={showResetConfirm}
        onCancel={() => setShowResetConfirm(false)}
        onConfirm={handleResetConfirm}
      />

      {/* Footer */}
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
          <div className="flex flex-col items-center md:items-end gap-2">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Creator</span>
              <div className="flex items-center gap-2 px-3 py-1 bg-pink-50 border-2 border-black rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Smile size={12} className="text-pink-500" />
                <span className="text-xs font-black">{CREATOR.name} | {CREATOR.tagline}</span>
              </div>
              <div className="flex gap-2">
                {CREATOR.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                  >
                    {link.icon === "x" ? <X size={12} /> : <ExternalLink size={12} />}
                  </a>
                ))}
              </div>
            </div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
              Powered by Gemini API
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
