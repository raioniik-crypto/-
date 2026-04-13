"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import StepIndicator from "@/components/StepIndicator";
import QuestionCard from "@/components/QuestionCard";
import PromptCard from "@/components/PromptCard";
import ResultCard from "@/components/ResultCard";
import {
  Step,
  Question,
  GeneratedPrompt,
  VerificationResult,
  QuestionCount,
  PromptCount,
} from "./types";

const pageVariants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-100 dark:border-gray-700 animate-pulse space-y-4">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
      <div className="flex gap-2 mt-2">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full w-20" />
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full w-24" />
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full w-16" />
      </div>
    </div>
  );
}

function ErrorFallback({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center"
    >
      <p className="text-red-600 dark:text-red-400 font-semibold mb-2">
        エラーが発生しました
      </p>
      <p className="text-red-500 dark:text-red-300 text-sm mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
      >
        再試行
      </button>
    </motion.div>
  );
}

export default function Home() {
  const [step, setStep] = useState<Step>(1);
  const [userInput, setUserInput] = useState("");
  const [questionCount, setQuestionCount] = useState<QuestionCount>(5);
  const [promptCount, setPromptCount] = useState<PromptCount>(5);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [prompts, setPrompts] = useState<GeneratedPrompt[]>([]);
  const [verificationResult, setVerificationResult] =
    useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allAnswered =
    questions.length > 0 &&
    questions.every((_, i) => {
      const a = answers[i];
      return a && a !== "__other__";
    });

  const handleSubmitInput = useCallback(async () => {
    if (!userInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInput, questionCount }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setQuestions(data.questions);
      setAnswers({});
      setStep(2);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "質問の生成に失敗しました。もう一度お試しください。"
      );
    } finally {
      setLoading(false);
    }
  }, [userInput, questionCount]);

  const handleGeneratePrompts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const answersArray = questions.map((q, i) => ({
        question: q.q,
        answer: answers[i],
      }));
      const res = await fetch("/api/generate-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userInput,
          answers: answersArray,
          promptCount,
        }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPrompts(data.prompts);
      setStep(3);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "プロンプトの生成に失敗しました。もう一度お試しください。"
      );
    } finally {
      setLoading(false);
    }
  }, [userInput, questions, answers, promptCount]);

  const handleExecute = useCallback(async (prompt: string) => {
    setLoading(true);
    setError(null);
    setStep(4);
    try {
      const res = await fetch("/api/execute-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setVerificationResult(data);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "実行に失敗しました。もう一度お試しください。"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const handleReset = () => {
    setStep(1);
    setUserInput("");
    setQuestions([]);
    setAnswers({});
    setPrompts([]);
    setVerificationResult(null);
    setError(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-950 dark:to-gray-900 px-4 py-8 sm:py-12">
      <div className="max-w-3xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl font-extrabold text-center mb-2 text-gray-800 dark:text-gray-100"
        >
          AI Prompt Generator
        </motion.h1>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-8">
          やりたいことを入力するだけで、最適なプロンプトを自動生成
        </p>

        <StepIndicator current={step} />

        <AnimatePresence mode="wait">
          {/* STEP 1: Input */}
          {step === 1 && (
            <motion.div
              key="step1"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-8 border border-gray-100 dark:border-gray-700">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                  やりたいことを一言で書いてください
                </label>
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="例：ブログ記事のSEO対策を強化したい"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none text-base"
                />

                <div className="mt-5">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    質問数を選択
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {([3, 5, 7, 10] as QuestionCount[]).map((n) => (
                      <button
                        key={n}
                        onClick={() => setQuestionCount(n)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                          questionCount === n
                            ? "bg-blue-500 text-white border-blue-500"
                            : "bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-300"
                        }`}
                      >
                        {n}問
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSubmitInput}
                  disabled={!userInput.trim() || loading}
                  className="mt-6 w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold text-base hover:from-blue-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="animate-spin h-5 w-5"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      質問を生成中...
                    </span>
                  ) : (
                    "次へ進む"
                  )}
                </button>
              </div>

              {error && (
                <div className="mt-4">
                  <ErrorFallback
                    message={error}
                    onRetry={handleSubmitInput}
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 2: Questions */}
          {step === 2 && (
            <motion.div
              key="step2"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: questionCount }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {questions.map((q, i) => (
                      <QuestionCard
                        key={i}
                        question={q}
                        index={i}
                        selectedAnswer={answers[i]}
                        onAnswer={(answer) =>
                          setAnswers((prev) => ({ ...prev, [i]: answer }))
                        }
                      />
                    ))}
                  </div>

                  <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-md p-5 border border-gray-100 dark:border-gray-700">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      生成するプロンプト数を選択
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {([5, 10, 15] as PromptCount[]).map((n) => (
                        <button
                          key={n}
                          onClick={() => setPromptCount(n)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                            promptCount === n
                              ? "bg-blue-500 text-white border-blue-500"
                              : "bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-300"
                          }`}
                        >
                          {n}個
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={handleGeneratePrompts}
                      disabled={!allAnswered || loading}
                      className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold text-base hover:from-blue-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg
                            className="animate-spin h-5 w-5"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                          プロンプトを生成中...
                        </span>
                      ) : (
                        "プロンプトを生成する"
                      )}
                    </button>
                    {!allAnswered && questions.length > 0 && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                        すべての質問に回答してください
                      </p>
                    )}
                  </div>
                </>
              )}

              {error && (
                <div className="mt-4">
                  <ErrorFallback
                    message={error}
                    onRetry={handleGeneratePrompts}
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 3: Generated Prompts */}
          {step === 3 && (
            <motion.div
              key="step3"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: promptCount }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {prompts.map((p, i) => (
                    <PromptCard
                      key={i}
                      prompt={p}
                      index={i}
                      onExecute={handleExecute}
                    />
                  ))}
                </div>
              )}

              {error && (
                <div className="mt-4">
                  <ErrorFallback
                    message={error}
                    onRetry={() => setStep(2)}
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 4: Execution & Verification */}
          {step === 4 && (
            <motion.div
              key="step4"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              {loading ? (
                <div className="space-y-4">
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              ) : verificationResult ? (
                <ResultCard result={verificationResult} />
              ) : null}

              {error && (
                <div className="mt-4">
                  <ErrorFallback
                    message={error}
                    onRetry={() => setStep(3)}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-8 flex justify-between items-center">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => (s - 1) as Step)}
              disabled={loading}
              className="px-5 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
            >
              ← 戻る
            </button>
          )}
          <button
            onClick={handleReset}
            className="ml-auto px-5 py-2 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            最初からやり直す
          </button>
        </div>

        <footer className="mt-12 text-center text-xs text-gray-400 dark:text-gray-600">
          Powered by Claude API
        </footer>
      </div>
    </main>
  );
}
