"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GenerateResult,
  OutputTab,
  OUTPUT_TAB_LABELS,
} from "@/app/types";
import CopyButton from "./CopyButton";

interface OutputPanelProps {
  result: GenerateResult | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

function Skeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 animate-pulse space-y-3"
        >
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-violet-100 dark:from-blue-900/30 dark:to-violet-900/30 flex items-center justify-center mb-4">
        <svg
          className="w-10 h-10 text-blue-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      </div>
      <p className="text-gray-500 dark:text-gray-400 font-medium mb-1">
        まだ生成結果がありません
      </p>
      <p className="text-sm text-gray-400 dark:text-gray-500">
        左の入力欄を埋めて「コンテンツを一括生成」をクリック
      </p>
    </div>
  );
}

function XPostsView({ result }: { result: GenerateResult }) {
  return (
    <div className="space-y-4">
      {result.xPosts.map((post, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {post.label}
            </span>
            <CopyButton text={`${post.body}\n\n${post.hashtags.map((h) => `#${h}`).join(" ")}`} />
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed mb-3">
            {post.body}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {post.hashtags.map((tag, j) => (
              <span
                key={j}
                className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
              >
                #{tag}
              </span>
            ))}
          </div>
          <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            {post.body.length}文字
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function CarouselView({ result }: { result: GenerateResult }) {
  return (
    <div className="space-y-3">
      {result.carousel.map((slide, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 dark:text-violet-400">
              <span className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-[11px]">
                {slide.slideNumber}
              </span>
              スライド {slide.slideNumber}
            </span>
            <CopyButton
              text={`${slide.title}\n${slide.subtitle}\n\n${slide.body}`}
            />
          </div>
          <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-0.5">
            {slide.title}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            {slide.subtitle}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {slide.body}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

function ImagePromptsView({ result }: { result: GenerateResult }) {
  return (
    <div className="space-y-4">
      {result.imagePrompts.map((prompt, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              {prompt.label}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">
                {prompt.aspectRatio}
              </span>
              <CopyButton text={prompt.mainPrompt} label="Main" />
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                Main Prompt
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 font-mono leading-relaxed">
                {prompt.mainPrompt}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                Style / Sub Prompt
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 font-mono leading-relaxed">
                {prompt.subPrompt}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-red-500 dark:text-red-400 mb-1 uppercase tracking-wide">
                Negative Prompt
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-red-50 dark:bg-red-900/20 rounded-lg p-3 font-mono leading-relaxed">
                {prompt.negativePrompt}
              </p>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <CopyButton
              text={`Main: ${prompt.mainPrompt}\nStyle: ${prompt.subPrompt}\nNegative: ${prompt.negativePrompt}\nAspect: ${prompt.aspectRatio}`}
              label="全体コピー"
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function CanvaTextsView({ result }: { result: GenerateResult }) {
  const sections: { key: keyof GenerateResult["canvaTexts"]; label: string; color: string }[] = [
    { key: "coverTitles", label: "カバータイトル", color: "blue" },
    { key: "subTitles", label: "サブタイトル", color: "violet" },
    { key: "highlightWords", label: "強調ワード", color: "amber" },
    { key: "descriptions", label: "説明文", color: "emerald" },
    { key: "ctaTexts", label: "CTA文言", color: "rose" },
    { key: "badgeShortTexts", label: "バッジ・ラベル", color: "cyan" },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800",
    violet: "bg-violet-50 border-violet-200 dark:bg-violet-900/20 dark:border-violet-800",
    amber: "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800",
    emerald: "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800",
    rose: "bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800",
    cyan: "bg-cyan-50 border-cyan-200 dark:bg-cyan-900/20 dark:border-cyan-800",
  };

  const labelColorMap: Record<string, string> = {
    blue: "text-blue-700 dark:text-blue-300",
    violet: "text-violet-700 dark:text-violet-300",
    amber: "text-amber-700 dark:text-amber-300",
    emerald: "text-emerald-700 dark:text-emerald-300",
    rose: "text-rose-700 dark:text-rose-300",
    cyan: "text-cyan-700 dark:text-cyan-300",
  };

  return (
    <div className="space-y-4">
      {sections.map(({ key, label, color }, i) => {
        const items = result.canvaTexts[key];
        return (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`rounded-xl p-4 border ${colorMap[color]}`}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className={`text-sm font-bold ${labelColorMap[color]}`}>
                {label}
              </h4>
              <CopyButton text={items.join("\n")} />
            </div>
            <div className="space-y-1.5">
              {items.map((item, j) => (
                <div
                  key={j}
                  className="flex items-center justify-between gap-2 group"
                >
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {item}
                  </p>
                  <CopyButton
                    text={item}
                    label=""
                    className="opacity-0 group-hover:opacity-100"
                  />
                </div>
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export default function OutputPanel({
  result,
  loading,
  error,
  onRetry,
}: OutputPanelProps) {
  const [activeTab, setActiveTab] = useState<OutputTab>("xPosts");

  const tabs: OutputTab[] = ["xPosts", "carousel", "imagePrompts", "canvaTexts"];

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <p className="text-red-700 dark:text-red-300 font-semibold mb-1">
          エラーが発生しました
        </p>
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">
          {error}
        </p>
        <button
          onClick={onRetry}
          className="px-5 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
        >
          再試行
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
            AIがコンテンツを生成中...
          </p>
        </div>
        <Skeleton />
      </div>
    );
  }

  if (!result) {
    return <EmptyState />;
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 min-w-0 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab
                ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {OUTPUT_TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === "xPosts" && <XPostsView result={result} />}
          {activeTab === "carousel" && <CarouselView result={result} />}
          {activeTab === "imagePrompts" && <ImagePromptsView result={result} />}
          {activeTab === "canvaTexts" && <CanvaTextsView result={result} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
