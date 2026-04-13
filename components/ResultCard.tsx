"use client";

import { motion } from "framer-motion";
import { VerificationResult } from "@/app/types";

interface ResultCardProps {
  result: VerificationResult;
}

export default function ResultCard({ result }: ResultCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Execution Result */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-5 sm:p-6">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-400 text-sm">
            ▶
          </span>
          実行結果
        </h3>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
          {result.result}
        </div>
      </div>

      {/* Error Check */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-5 sm:p-6">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center text-red-600 dark:text-red-400 text-sm">
            !
          </span>
          エラー検証
        </h3>
        {result.errors.length === 0 ? (
          <p className="text-sm text-green-600 dark:text-green-400">
            エラーや矛盾は見つかりませんでした。
          </p>
        ) : (
          <ul className="space-y-2">
            {result.errors.map((error, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 p-3 rounded-lg"
              >
                <span className="shrink-0 mt-0.5">&#x26A0;</span>
                {error}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Source Flags */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-5 sm:p-6">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400 text-sm">
            ?
          </span>
          ソース確認（要事実確認）
        </h3>
        {result.sourceFlags.length === 0 ? (
          <p className="text-sm text-green-600 dark:text-green-400">
            事実確認が必要な箇所は見つかりませんでした。
          </p>
        ) : (
          <ul className="space-y-2">
            {result.sourceFlags.map((flag, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 p-3 rounded-lg"
              >
                <span className="shrink-0 mt-0.5">&#x1F50D;</span>
                {flag}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Suggestions */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-5 sm:p-6">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-400 text-sm">
            +
          </span>
          追加要素の提案
        </h3>
        {result.suggestions.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            追加提案はありません。
          </p>
        ) : (
          <ul className="space-y-2">
            {result.suggestions.map((suggestion, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 p-3 rounded-lg"
              >
                <span className="shrink-0 mt-0.5">&#x1F4A1;</span>
                {suggestion}
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}
