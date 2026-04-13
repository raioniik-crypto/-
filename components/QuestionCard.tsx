"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Question } from "@/app/types";

interface QuestionCardProps {
  question: Question;
  index: number;
  onAnswer: (answer: string) => void;
  selectedAnswer: string | undefined;
}

export default function QuestionCard({
  question,
  index,
  onAnswer,
  selectedAnswer,
}: QuestionCardProps) {
  const [customText, setCustomText] = useState("");
  const isOther = selectedAnswer === "__other__";
  const otherLabel = "その他（自由記入）";

  const handleSelect = (option: string) => {
    if (option === otherLabel) {
      onAnswer("__other__");
    } else {
      onAnswer(option);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 shadow-md border border-gray-100 dark:border-gray-700"
    >
      <p className="font-semibold text-base sm:text-lg mb-4 text-gray-800 dark:text-gray-100">
        <span className="text-blue-500 mr-2">Q{index + 1}.</span>
        {question.q}
      </p>
      <div className="flex flex-wrap gap-2">
        {question.options.map((option) => {
          const isSelected =
            option === otherLabel
              ? isOther
              : selectedAnswer === option;

          return (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              className={`px-3 py-2 sm:px-4 sm:py-2 rounded-full text-sm transition-all border ${
                isSelected
                  ? "bg-blue-500 text-white border-blue-500 shadow-md"
                  : "bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
      {isOther && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-3"
        >
          <input
            type="text"
            value={customText}
            onChange={(e) => {
              setCustomText(e.target.value);
              if (e.target.value) {
                onAnswer(`その他: ${e.target.value}`);
              }
            }}
            placeholder="自由に入力してください..."
            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </motion.div>
      )}
    </motion.div>
  );
}
