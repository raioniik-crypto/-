"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import InputForm from "@/components/InputForm";
import OutputPanel from "@/components/OutputPanel";
import { FormInput, GenerateResult, INITIAL_FORM } from "./types";

const STORAGE_KEY = "sns-content-generator-draft";

export default function Home() {
  const [form, setForm] = useState<FormInput>(INITIAL_FORM);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as FormInput;
        setForm(parsed);
      }
    } catch {
      // ignore parse errors
    }
    setHydrated(true);
  }, []);

  // Save to localStorage on form change
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {
      // ignore quota errors
    }
  }, [form, hydrated]);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);

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
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "不明なエラーが発生しました。もう一度お試しください。"
      );
    } finally {
      setLoading(false);
    }
  }, [form]);

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/20 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="border-b border-gray-200/60 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 leading-tight">
                SNS Content Generator
              </h1>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 hidden sm:block">
                X投稿・カルーセル・画像プロンプト・Canva文字を一括生成
              </p>
            </div>
          </motion.div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-medium">
              Powered by Gemini
            </span>
          </div>
        </div>
      </header>

      {/* Main content: 2 columns */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full lg:w-[440px] xl:w-[480px] lg:shrink-0"
          >
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm p-5 sm:p-6 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
              <InputForm
                form={form}
                onChange={setForm}
                onSubmit={handleGenerate}
                onReset={handleReset}
                loading={loading}
              />
            </div>
          </motion.div>

          {/* Right: Output */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-1 min-w-0"
          >
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm p-5 sm:p-6">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">
                生成結果
              </h2>
              <OutputPanel
                result={result}
                loading={loading}
                error={error}
                onRetry={handleGenerate}
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200/60 dark:border-gray-800 mt-8">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-xs text-gray-400 dark:text-gray-600">
          SNS Content Generator &mdash; Powered by Gemini API
        </div>
      </footer>
    </main>
  );
}
