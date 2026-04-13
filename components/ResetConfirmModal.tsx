"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";

interface ResetConfirmModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ResetConfirmModal({ isOpen, onCancel, onConfirm }: ResetConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white border-4 border-black rounded-3xl p-8 max-w-sm w-full shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center border-4 border-black">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-2xl font-black">本当にリセットしますか？</h3>
              <p className="text-slate-600 font-bold">入力した内容がすべて消えてしまいます。</p>
              <div className="flex gap-3 w-full mt-4">
                <button
                  onClick={onCancel}
                  className="flex-1 py-3 bg-slate-100 border-2 border-black rounded-xl font-black hover:bg-slate-200 transition-all"
                >
                  キャンセル
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 py-3 bg-red-500 text-white border-2 border-black rounded-xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                >
                  リセット
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
