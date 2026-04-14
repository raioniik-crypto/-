"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Send,
  Trash2,
  RefreshCw,
  Wand2,
  ChevronDown,
  Sparkles,
  Image as ImageIcon,
  Copy,
  Settings,
  ChevronUp,
} from "lucide-react";
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

const GRID_PAIRS: [keyof FormInput, keyof FormInput][] = [
  ["target", "targetPain"],
  ["strength", "proof"],
  ["announcement", "cta"],
  ["tone", "purpose"],
  ["keywords", "ngExpressions"],
];

const GRID_FIELD_SET = new Set(GRID_PAIRS.flat());

const AI_PROMPT_TEMPLATE = `あなたはSNSコンテンツ生成のプロフェッショナルです。
以下の情報を元に、SNS投稿生成アシスタントに入力するためのJSONデータを作成してください。

【ユーザー情報】
[ここに情報を入力]

【出力形式】
以下のキーを持つJSONオブジェクトのみを出力してください。
{
  "productName": "プロジェクト名",
  "overview": "内容の要約",
  "target": "ターゲット層",
  "targetPain": "ターゲットの悩み",
  "benefit": "提供価値",
  "strength": "強み・特徴",
  "proof": "実績・証拠",
  "announcement": "告知内容",
  "cta": "誘導先・アクション",
  "tone": "トーン＆マナー",
  "purpose": "投稿の目的",
  "keywords": "キーワード（カンマ区切り）",
  "ngExpressions": "NG表現（カンマ区切り）",
  "reference": "参考URLやアカウント",
  "imageDirection": "画像の世界観・指示",
  "carouselSlides": 7,
  "additionalNotes": "追加の補足事項"
}`;

export default function InputForm({
  form,
  onChange,
  onSubmit,
  onResetClick,
  loading,
  onToast,
}: InputFormProps) {
  const [showMagicPanel, setShowMagicPanel] = useState(false);
  const [magicPaste, setMagicPaste] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [useThinkingMode, setUseThinkingMode] = useState(false);
  const [useHighQualityImage, setUseHighQualityImage] = useState(false);

  const updateField = (key: keyof FormInput, value: string | number) => {
    onChange({ ...form, [key]: value });
  };

  const handleAutoFill = () => {
    onChange(SAMPLE_INPUT);
    onToast("サンプルデータを入力しました");
  };

  const handleMagicAutofill = () => {
    try {
      const data = JSON.parse(magicPaste);
      onChange({ ...form, ...data });
      onToast("魔法の力で全項目を埋めました！");
      setMagicPaste("");
      setShowMagicPanel(false);
    } catch {
      onToast("JSONの形式が正しくないようです。AIに生成させたデータをそのまま貼り付けてね！");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    onToast("プロンプトをコピーしました！AIに貼り付けてね");
  };

  const isValid = form.productName.trim().length > 0;

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

  const renderedFields: React.ReactNode[] = [];
  const rendered = new Set<keyof FormInput>();

  for (const key of FIELD_ORDER) {
    if (rendered.has(key)) continue;
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
    <div className="space-y-6">
      {/* ========== MAGIC AUTOFILL Card ========== */}
      <div className="bg-white border-4 border-black rounded-3xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <button
          onClick={() => setShowMagicPanel(!showMagicPanel)}
          className="w-full p-6 flex items-center justify-between bg-cyan-400 hover:bg-cyan-500 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white border-2 border-black rounded-lg group-hover:rotate-12 transition-transform">
              <Wand2 size={24} className="text-black" />
            </div>
            <div className="text-left">
              <h3 className="font-black text-lg leading-tight">MAGIC AUTOFILL</h3>
              <p className="text-xs font-bold opacity-80">AIを使って一瞬で全項目を埋める！</p>
            </div>
          </div>
          <div className={`transition-transform duration-300 ${showMagicPanel ? "rotate-180" : ""}`}>
            <ChevronDown size={24} className="font-black" />
          </div>
        </button>

        <AnimatePresence>
          {showMagicPanel && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-6 space-y-6 border-t-4 border-black bg-slate-50">
                {/* Step 1 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs font-black">
                      1
                    </div>
                    <p className="font-black text-sm">AIに指示を出すプロンプトをコピー</p>
                  </div>
                  <div className="relative group">
                    <pre className="p-4 bg-white border-2 border-black rounded-xl text-[10px] font-mono overflow-x-auto whitespace-pre-wrap max-h-[150px] overflow-y-auto custom-scrollbar">
                      {AI_PROMPT_TEMPLATE}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(AI_PROMPT_TEMPLATE)}
                      className="absolute top-2 right-2 p-2 bg-yellow-400 border-2 border-black rounded-lg hover:scale-110 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500">
                    ※ChatGPTやGeminiにこのプロンプトを貼り付けて、[ユーザー情報]を埋めて実行してください。
                  </p>
                </div>

                {/* Step 2 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs font-black">
                      2
                    </div>
                    <p className="font-black text-sm">AIが生成したJSONをここに貼り付け</p>
                  </div>
                  <textarea
                    value={magicPaste}
                    onChange={(e) => setMagicPaste(e.target.value)}
                    placeholder='{"productName": "...", "overview": "...", ...}'
                    className="w-full p-4 bg-white border-2 border-black rounded-xl font-mono text-xs min-h-[120px] outline-none focus:bg-white transition-all shadow-inner"
                  />
                  <button
                    onClick={handleMagicAutofill}
                    disabled={!magicPaste.trim()}
                    className="w-full py-3 bg-pink-500 disabled:bg-pink-300 text-white font-black rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles size={20} />
                    魔法を実行する！
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ========== Main Input Card ========== */}
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

          {/* Carousel slider */}
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
                className="w-full"
              />
              <div className="flex justify-between mt-2 text-[10px] font-black text-slate-400">
                <span>3枚</span>
                <span>5枚</span>
                <span>7枚</span>
                <span>10枚</span>
              </div>
            </div>
          </div>

          {/* ========== Advanced Settings ========== */}
          <div className="border-4 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full p-4 bg-slate-100 flex items-center justify-between font-black text-sm hover:bg-slate-200 transition-all"
            >
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-indigo-600" />
                詳細設定 (Advanced)
              </div>
              {showAdvanced ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="overflow-hidden bg-white"
                >
                  <div className="p-4 space-y-4 border-t-4 border-black">
                    <div className="p-3 bg-yellow-50 border-2 border-black rounded-xl">
                      <p className="text-[10px] font-bold text-yellow-700">
                        ※詳細設定を有効にすると、生成により時間がかかる場合がありますが、より意図に沿った出力が得られます。
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ========== Thinking Mode Toggle ========== */}
          <div className="p-4 bg-indigo-50 border-4 border-black rounded-2xl flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 text-white rounded-lg border-2 border-black">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="text-sm font-black">思考モード (Thinking Mode)</p>
                <p className="text-[10px] font-bold text-indigo-600">より複雑で高品質な生成を行います</p>
              </div>
            </div>
            <button
              onClick={() => setUseThinkingMode(!useThinkingMode)}
              className={`w-14 h-8 rounded-full border-4 border-black relative transition-all ${
                useThinkingMode ? "bg-indigo-500" : "bg-slate-200"
              }`}
            >
              <motion.div
                animate={{ x: useThinkingMode ? 24 : 0 }}
                className="absolute top-0.5 left-0.5 w-5 h-5 bg-white border-2 border-black rounded-full"
              />
            </button>
          </div>

          {/* ========== High Quality Image Toggle ========== */}
          <div className="p-4 bg-cyan-50 border-4 border-black rounded-2xl flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-600 text-white rounded-lg border-2 border-black">
                <ImageIcon size={20} />
              </div>
              <div>
                <p className="text-sm font-black">高画質画像生成</p>
                <p className="text-[10px] font-bold text-cyan-600">より詳細で高品質な画像を生成します</p>
              </div>
            </div>
            <button
              onClick={() => setUseHighQualityImage(!useHighQualityImage)}
              className={`w-14 h-8 rounded-full border-4 border-black relative transition-all ${
                useHighQualityImage ? "bg-cyan-500" : "bg-slate-200"
              }`}
            >
              <motion.div
                animate={{ x: useHighQualityImage ? 24 : 0 }}
                className="absolute top-0.5 left-0.5 w-5 h-5 bg-white border-2 border-black rounded-full"
              />
            </button>
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
    </div>
  );
}
