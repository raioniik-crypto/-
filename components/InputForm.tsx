"use client";

import { FileText, Send, Trash2, RefreshCw } from "lucide-react";
import { FormInput, FORM_FIELD_LABELS, FORM_PLACEHOLDERS } from "@/app/types";
import { SAMPLE_INPUT } from "@/lib/sample-data";

interface InputFormProps {
  form: FormInput;
  onChange: (form: FormInput) => void;
  onSubmit: () => void;
  onResetClick: () => void;
  loading: boolean;
  onToast: (message: string) => void;
}

const TEXTAREA_FIELDS = new Set<keyof FormInput>([
  "overview",
  "targetPain",
  "benefit",
  "strength",
  "proof",
  "reference",
  "additionalNotes",
]);

const FIELD_ORDER: (keyof FormInput)[] = [
  "productName",
  "overview",
  "target",
  "targetPain",
  "benefit",
  "strength",
  "proof",
  "announcement",
  "cta",
  "tone",
  "purpose",
  "keywords",
  "ngExpressions",
  "reference",
  "imageDirection",
  "additionalNotes",
];

// Fields that should be displayed in 2-column grid
const GRID_PAIRS: [keyof FormInput, keyof FormInput][] = [
  ["target", "targetPain"],
  ["strength", "proof"],
  ["announcement", "cta"],
  ["tone", "purpose"],
  ["keywords", "ngExpressions"],
];

const GRID_FIELD_SET = new Set(GRID_PAIRS.flat());

export default function InputForm({
  form,
  onChange,
  onSubmit,
  onResetClick,
  loading,
  onToast,
}: InputFormProps) {
  const updateField = (key: keyof FormInput, value: string | number) => {
    onChange({ ...form, [key]: value });
  };

  const handleAutoFill = () => {
    onChange(SAMPLE_INPUT);
    onToast("サンプルデータを入力しました");
  };

  const isValid = form.productName.trim().length > 0;

  // Render a single field
  const renderField = (key: keyof FormInput) => {
    if (key === "carouselSlides") return null;
    const label = FORM_FIELD_LABELS[key];
    const placeholder = FORM_PLACEHOLDERS[key];
    const isTextarea = TEXTAREA_FIELDS.has(key);
    const hasError = key === "productName" && !form.productName.trim();

    return (
      <div key={key} className="space-y-2">
        <label className="text-sm font-black text-black">{label}</label>
        {isTextarea ? (
          <textarea
            value={form[key] as string}
            onChange={(e) => updateField(key, e.target.value)}
            placeholder={placeholder}
            className={`w-full px-4 py-3 rounded-xl border-2 border-black focus:bg-yellow-50 outline-none transition-all font-bold min-h-[100px] ${
              hasError ? "border-red-500 bg-red-50" : ""
            }`}
          />
        ) : (
          <input
            type="text"
            value={form[key] as string}
            onChange={(e) => updateField(key, e.target.value)}
            placeholder={placeholder}
            className={`w-full px-4 py-3 rounded-xl border-2 border-black focus:bg-yellow-50 outline-none transition-all font-bold ${
              hasError ? "border-red-500 bg-red-50" : ""
            }`}
          />
        )}
      </div>
    );
  };

  // Build rendered fields: singles + pairs
  const renderedFields: React.ReactNode[] = [];
  const rendered = new Set<keyof FormInput>();

  for (const key of FIELD_ORDER) {
    if (rendered.has(key)) continue;

    // Check if this key is part of a grid pair
    const pair = GRID_PAIRS.find(([a, b]) => a === key || b === key);
    if (pair && !rendered.has(pair[0]) && !rendered.has(pair[1])) {
      renderedFields.push(
        <div key={`pair-${pair[0]}`} className="grid grid-cols-2 gap-4">
          {renderField(pair[0])}
          {renderField(pair[1])}
        </div>
      );
      rendered.add(pair[0]);
      rendered.add(pair[1]);
    } else if (!GRID_FIELD_SET.has(key) || rendered.has(key)) {
      renderedFields.push(renderField(key));
      rendered.add(key);
    }
  }

  return (
    <div className="bg-white rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b-4 border-black bg-indigo-50 flex items-center justify-between">
        <h2 className="font-black text-xl flex items-center gap-2">
          <FileText size={24} className="text-indigo-600" />
          入力エリア
        </h2>
        <button
          onClick={handleAutoFill}
          className="text-xs font-black bg-white border-2 border-black px-3 py-1.5 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
        >
          サンプルを自動入力
        </button>
      </div>

      {/* Fields */}
      <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white">
        {renderedFields}

        {/* Image direction chips */}
        <div className="space-y-2">
          <label className="text-sm font-black text-black">画像の方向性</label>
          <div className="flex flex-wrap gap-2">
            {["写実", "イラスト", "ミニマル", "未来感", "高級感", "ポップ"].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => updateField("imageDirection", opt)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                  form.imageDirection === opt
                    ? "bg-pink-500 text-white translate-x-[1px] translate-y-[1px] shadow-none"
                    : "bg-white text-black hover:bg-yellow-100"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Carousel pages slider */}
        <div className="space-y-2">
          <label className="text-sm font-black text-black">
            カルーセル枚数: {form.carouselSlides}枚
          </label>
          <div className="px-2 py-4">
            <input
              type="range"
              min="3"
              max="10"
              step="1"
              value={form.carouselSlides}
              onChange={(e) => updateField("carouselSlides", parseInt(e.target.value))}
              className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500 border-2 border-black"
            />
            <div className="flex justify-between mt-2 text-[10px] font-black text-slate-400">
              <span>3枚</span>
              <span>5枚</span>
              <span>7枚</span>
              <span>10枚</span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit area */}
      <div className="p-6 bg-indigo-50 border-t-4 border-black flex items-center gap-3">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!isValid || loading}
          className="flex-1 bg-pink-500 hover:bg-pink-600 disabled:bg-pink-300 text-white font-black py-4 rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] border-2 border-black transition-all flex items-center justify-center gap-2 group hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
        >
          {loading ? (
            <>
              <RefreshCw size={24} className="animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Send
                size={24}
                className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
              />
              まとめて生成
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onResetClick}
          className="p-4 bg-white text-black hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
          title="リセット"
        >
          <Trash2 size={24} />
        </button>
      </div>
    </div>
  );
}
