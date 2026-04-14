"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Trash2, Download } from "lucide-react";
import { FormInput } from "@/app/types";

interface SavedTemplate {
  id: string;
  name: string;
  data: FormInput;
  createdAt: string;
}

const STORAGE_KEY = "sns-user-templates";

function loadTemplates(): SavedTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTemplates(templates: SavedTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentForm: FormInput;
  onApply: (data: FormInput) => void;
  onToast: (message: string) => void;
}

export default function TemplateModal({
  isOpen,
  onClose,
  currentForm,
  onApply,
  onToast,
}: TemplateModalProps) {
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [newName, setNewName] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTemplates(loadTemplates());
      setNewName("");
      setShowSaveForm(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!newName.trim()) return;
    const template: SavedTemplate = {
      id: Date.now().toString(),
      name: newName.trim(),
      data: currentForm,
      createdAt: new Date().toLocaleDateString("ja-JP"),
    };
    const updated = [template, ...templates];
    setTemplates(updated);
    saveTemplates(updated);
    setNewName("");
    setShowSaveForm(false);
    onToast(`「${template.name}」を保存しました`);
  };

  const handleDelete = (id: string) => {
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    saveTemplates(updated);
    onToast("テンプレートを削除しました");
  };

  const handleApply = (template: SavedTemplate) => {
    onApply(template.data);
    onClose();
    onToast(`「${template.name}」を適用しました`);
  };

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
            className="relative bg-white border-4 border-black rounded-3xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
          >
            {/* Header */}
            <div className="p-6 border-b-4 border-black bg-indigo-50 flex items-center justify-between rounded-t-[calc(1.5rem-4px)]">
              <h3 className="text-xl font-black flex items-center gap-2">
                <Save size={22} className="text-indigo-600" />
                マイテンプレート
              </h3>
              <button
                onClick={onClose}
                className="p-2 bg-white border-2 border-black rounded-lg hover:bg-red-50 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {/* Save current */}
              {!showSaveForm ? (
                <button
                  onClick={() => setShowSaveForm(true)}
                  className="w-full py-3 bg-cyan-400 text-black font-black rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  現在の入力をテンプレートとして保存
                </button>
              ) : (
                <div className="p-4 bg-cyan-50 border-4 border-black rounded-2xl space-y-3">
                  <label className="text-xs font-black">テンプレート名</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="例：美容系LP案件用"
                    className="w-full px-3 py-2 rounded-xl border-2 border-black focus:bg-yellow-50 outline-none font-bold text-sm"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={!newName.trim()}
                      className="flex-1 py-2 bg-pink-500 disabled:bg-pink-300 text-white font-black rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all text-xs"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setShowSaveForm(false)}
                      className="px-4 py-2 bg-white font-black rounded-lg border-2 border-black text-xs hover:bg-slate-50 transition-colors"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}

              {/* Template list */}
              {templates.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm font-bold text-slate-400">保存済みテンプレートはありません</p>
                  <p className="text-[10px] font-bold text-slate-300 mt-1">上のボタンから保存できます</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    保存済み ({templates.length})
                  </p>
                  {templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="p-4 bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-black text-sm truncate">{tpl.name}</p>
                        <p className="text-[10px] font-bold text-slate-400">
                          {tpl.data.productName || "（商品名なし）"} · {tpl.createdAt}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleApply(tpl)}
                          className="p-2 bg-indigo-500 text-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                          title="適用"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(tpl.id)}
                          className="p-2 bg-white text-red-500 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none hover:bg-red-50 transition-all"
                          title="削除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
