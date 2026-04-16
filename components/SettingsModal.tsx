"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CreditCard,
  LogOut,
  Coins,
  Zap,
  Info,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CREDIT_PLANS, CREDIT_COSTS, ACTION_LABELS } from "@/lib/billing";
import AuthForm from "./AuthForm";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToast: (message: string) => void;
  onAuthChange: () => void;
  refreshSignal?: number;
  /** true when opened due to insufficient credits — purchase section is prioritized */
  urgentPurchase?: boolean;
}

interface UserState {
  id: string;
  email: string;
}

export default function SettingsModal({
  isOpen,
  onClose,
  onToast,
  onAuthChange,
  refreshSignal,
  urgentPurchase = false,
}: SettingsModalProps) {
  const [user, setUser] = useState<UserState | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const purchaseRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  const checkAuth = useCallback(async () => {
    setChecking(true);
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser) {
        setUser({ id: authUser.id, email: authUser.email || "" });
        try {
          const res = await fetch("/api/credits");
          if (res.ok) {
            const data = await res.json();
            setBalance(data.balance);
          }
        } catch {
          // balance fetch failed
        }
      } else {
        setUser(null);
        setBalance(null);
      }
    } catch {
      setUser(null);
      setBalance(null);
    }
    setChecking(false);
  }, [supabase.auth]);

  useEffect(() => {
    if (isOpen) {
      checkAuth();
    }
  }, [isOpen, checkAuth]);

  useEffect(() => {
    if (refreshSignal === undefined) return;
    checkAuth();
  }, [refreshSignal, checkAuth]);

  // Auto-scroll to purchase section when urgentPurchase is true
  useEffect(() => {
    if (isOpen && urgentPurchase && !checking && user && purchaseRef.current) {
      purchaseRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [isOpen, urgentPurchase, checking, user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setBalance(null);
    onAuthChange();
    onToast("ログアウトしました");
  };

  const handlePurchase = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      const msg =
        raw === "Failed to fetch" || raw.includes("NetworkError")
          ? "通信エラーが発生しました。ネット接続を確認してもう一度お試しください。"
          : raw || "購入処理に失敗しました";
      onToast(msg);
    } finally {
      setLoadingPlan(null);
    }
  };

  // --- Purchase section (reused in both normal and urgent layouts) ---
  const PurchaseSection = ({ highlight }: { highlight: boolean }) => (
    <div ref={purchaseRef} className="space-y-3">
      {highlight && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-red-50 border-4 border-red-500 rounded-2xl shadow-[4px_4px_0px_0px_rgba(239,68,68,0.4)] flex items-start gap-3"
        >
          <AlertTriangle
            size={22}
            className="text-red-500 shrink-0 mt-0.5"
          />
          <div>
            <p className="font-black text-sm text-red-700">
              クレジットが不足しています
            </p>
            <p className="text-[11px] font-bold text-red-600 mt-0.5">
              続けるにはプランを購入してください。購入後すぐにご利用いただけます。
            </p>
          </div>
        </motion.div>
      )}

      <p className="text-xs font-black flex items-center gap-1">
        <CreditCard size={14} className="text-indigo-500" />
        クレジット購入
      </p>

      {CREDIT_PLANS.map((plan) => {
        const isRecommended = plan.popular;
        return (
          <motion.button
            key={plan.id}
            whileTap={{ scale: 0.97 }}
            onClick={() => handlePurchase(plan.id)}
            disabled={loadingPlan !== null}
            className={`w-full border-4 border-black rounded-2xl flex items-center justify-between transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:opacity-50 ${
              isRecommended
                ? `${
                    highlight ? "p-5" : "p-4"
                  } bg-pink-500 text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]`
                : "p-4 bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            }`}
          >
            <div className="text-left">
              <p
                className={`font-black ${
                  isRecommended && highlight ? "text-base" : "text-sm"
                }`}
              >
                {plan.label}
                {isRecommended && (
                  <span className="ml-2 inline-flex items-center gap-0.5 px-2 py-0.5 bg-yellow-400 text-black text-[9px] rounded-full border border-black font-black">
                    <Sparkles size={10} />
                    おすすめ
                  </span>
                )}
              </p>
              <p
                className={`text-[10px] font-bold ${
                  isRecommended ? "text-white/80" : "text-slate-500"
                }`}
              >
                {plan.credits}クレジット
                {isRecommended && " — 1クレジットあたり最安値"}
              </p>
            </div>
            <div className="text-right">
              <p
                className={`font-black ${
                  isRecommended && highlight ? "text-xl" : "text-lg"
                }`}
              >
                {loadingPlan === plan.id ? (
                  <span className="inline-block w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  `¥${plan.price.toLocaleString()}`
                )}
              </p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white border-4 border-black rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
          >
            {/* Header */}
            <div
              className={`p-6 border-b-4 border-black flex items-center justify-between rounded-t-[calc(1.5rem-4px)] ${
                urgentPurchase && user
                  ? "bg-red-500"
                  : "bg-yellow-400"
              }`}
            >
              <h3
                className={`text-xl font-black flex items-center gap-2 ${
                  urgentPurchase && user ? "text-white" : "text-black"
                }`}
              >
                {urgentPurchase && user ? (
                  <>
                    <AlertTriangle size={22} />
                    クレジット購入
                  </>
                ) : (
                  <>
                    <Coins size={22} />
                    設定
                  </>
                )}
              </h3>
              <button
                onClick={onClose}
                className="p-2 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {checking ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                </div>
              ) : !user ? (
                /* --- Not logged in --- */
                <div className="space-y-4">
                  <div className="p-4 bg-cyan-50 border-4 border-black rounded-2xl">
                    <p className="text-sm font-black mb-1">
                      ログインが必要です
                    </p>
                    <p className="text-[10px] font-bold text-slate-500">
                      クレジットの購入・消費にはアカウントが必要です。初回登録で10クレジットをプレゼント！
                    </p>
                  </div>
                  <AuthForm
                    onSuccess={() => {
                      checkAuth();
                      onAuthChange();
                    }}
                    onToast={onToast}
                  />
                </div>
              ) : (
                /* --- Logged in --- */
                <div className="space-y-5">
                  {/* Urgent: purchase first */}
                  {urgentPurchase && (
                    <PurchaseSection highlight />
                  )}

                  {/* Account info */}
                  <div className="p-4 bg-indigo-50 border-4 border-black rounded-2xl">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">
                      アカウント
                    </p>
                    <p className="font-black text-sm truncate">
                      {user.email}
                    </p>
                  </div>

                  {/* Balance */}
                  <div
                    className={`p-5 border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center ${
                      urgentPurchase && balance !== null && balance <= 0
                        ? "bg-red-100"
                        : "bg-yellow-100"
                    }`}
                  >
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      残高
                    </p>
                    <p className="text-4xl font-black">
                      {balance ?? "..."}
                      <span className="text-lg ml-1">credits</span>
                    </p>
                  </div>

                  {/* Cost info */}
                  <div className="p-4 bg-white border-4 border-black rounded-2xl space-y-2">
                    <p className="text-xs font-black flex items-center gap-1">
                      <Info size={14} className="text-indigo-500" />
                      消費ルール
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(CREDIT_COSTS).map(([key, cost]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between p-2 bg-slate-50 border-2 border-black rounded-lg"
                        >
                          <span className="text-[10px] font-black">
                            {ACTION_LABELS[key] || key}
                          </span>
                          <span className="text-xs font-black text-pink-600">
                            <Zap size={10} className="inline" /> {cost}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Normal purchase (only if not already shown urgently) */}
                  {!urgentPurchase && (
                    <PurchaseSection highlight={false} />
                  )}

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="w-full py-3 bg-slate-100 text-slate-600 font-black rounded-xl border-2 border-black hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <LogOut size={16} />
                    ログアウト
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
