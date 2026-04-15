"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

interface ToastProps {
  message: string;
  visible: boolean;
  type?: "success" | "error" | "info";
}

export default function Toast({
  message,
  visible,
  type = "success",
}: ToastProps) {
  const styles = {
    success: "bg-slate-900 text-white border-2 border-emerald-400",
    error: "bg-red-600 text-white border-2 border-red-200",
    info: "bg-indigo-600 text-white border-2 border-indigo-200",
  };

  const icons = {
    success: <CheckCircle2 size={18} className="shrink-0 text-emerald-300" />,
    error: <AlertCircle size={18} className="shrink-0 text-white" />,
    info: <Info size={18} className="shrink-0 text-white" />,
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-md rounded-2xl px-4 py-3 shadow-2xl flex items-start gap-3 ${styles[type]}`}
        >
          {icons[type]}
          <p className="text-sm font-bold leading-relaxed break-words">
            {message}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}