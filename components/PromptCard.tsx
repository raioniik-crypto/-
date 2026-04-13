"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { GeneratedPrompt } from "@/app/types";

interface PromptCardProps {
  prompt: GeneratedPrompt;
  index: number;
  onExecute: (prompt: string) => void;
}

export default function PromptCard({ prompt, index, onExecute }: PromptCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const rankColors: Record<number, string> = {
    1: "bg-yellow-400 text-yellow-900",
    2: "bg-gray-300 text-gray-800",
    3: "bg-orange-400 text-orange-900",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-3">
          <span
            className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shrink-0 ${
              rankColors[prompt.rank] || "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
            }`}
          >
            {prompt.rank}
          </span>
          <h3 className="font-bold text-base sm:text-lg text-gray-800 dark:text-gray-100 leading-tight">
            {prompt.title}
          </h3>
        </div>

        <div
          onClick={handleCopy}
          className="relative bg-gray-50 dark:bg-gray-900 rounded-xl p-4 mb-4 cursor-pointer group hover:ring-2 hover:ring-blue-300 dark:hover:ring-blue-600 transition-all"
        >
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
            {prompt.prompt}
          </p>
          <span className="absolute top-2 right-2 text-xs bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            {copied ? "コピー済み!" : "クリックでコピー"}
          </span>
        </div>

        {copied && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-3 text-center text-sm text-green-600 dark:text-green-400 font-medium"
          >
            クリップボードにコピーしました
          </motion.div>
        )}

        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5 shrink-0">▶</span>
            <div>
              <span className="font-semibold text-gray-700 dark:text-gray-200">使用用途：</span>
              <span className="text-gray-600 dark:text-gray-400">{prompt.usecase}</span>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 border border-blue-100 dark:border-blue-800">
            <p className="font-semibold text-blue-700 dark:text-blue-300 text-xs mb-1">
              Tips: 推奨AI
            </p>
            <p className="text-blue-800 dark:text-blue-200 font-medium">
              {prompt.tips.ai}
            </p>
            <p className="text-blue-600 dark:text-blue-400 text-xs mt-1">
              {prompt.tips.reason}
            </p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-3 border border-amber-100 dark:border-amber-800">
            <p className="font-semibold text-amber-700 dark:text-amber-300 text-xs mb-1">
              Warning: 注意事項
            </p>
            <p className="text-amber-700 dark:text-amber-200 text-xs">
              {prompt.warning}
            </p>
          </div>
        </div>

        <button
          onClick={() => onExecute(prompt.prompt)}
          className="mt-4 w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg"
        >
          このプロンプトで実行する
        </button>
      </div>
    </motion.div>
  );
}
