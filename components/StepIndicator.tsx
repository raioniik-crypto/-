"use client";

import { motion } from "framer-motion";
import { Step } from "@/app/types";

const steps = [
  { num: 1, label: "入力" },
  { num: 2, label: "アンケート" },
  { num: 3, label: "プロンプト生成" },
  { num: 4, label: "実行・検証" },
] as const;

export default function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-8">
      {steps.map((step, i) => (
        <div key={step.num} className="flex items-center">
          <div className="flex flex-col items-center">
            <motion.div
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base font-bold transition-colors ${
                step.num < current
                  ? "bg-green-500 text-white"
                  : step.num === current
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              }`}
              initial={false}
              animate={
                step.num === current ? { scale: [1, 1.15, 1] } : { scale: 1 }
              }
              transition={{ duration: 0.4 }}
            >
              {step.num < current ? "✓" : step.num}
            </motion.div>
            <span
              className={`text-[10px] sm:text-xs mt-1 whitespace-nowrap ${
                step.num === current
                  ? "text-blue-500 dark:text-blue-400 font-semibold"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-6 sm:w-12 h-0.5 mx-1 sm:mx-2 mb-4 ${
                step.num < current
                  ? "bg-green-500"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
