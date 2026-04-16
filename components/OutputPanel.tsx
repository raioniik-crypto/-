"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MousePointer2,
  Layout,
  Image as ImageIcon,
  Type,
  Copy,
  Sparkles,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  GenerateResult,
  OutputTab,
  OUTPUT_TAB_LABELS,
  AdjustTarget,
} from "@/app/types";
import { dedupeWithBody } from "@/lib/hashtag";
import { buildXPostUrl, EXTERNAL_URLS, ADJUST_CHIPS } from "@/lib/constants";

interface OutputPanelProps {
  result: GenerateResult | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onCopy: (text: string) => void;
  onAdjust: (target: AdjustTarget, instruction: string) => Promise<void>;
  adjusting: boolean;
}

const TABS: { id: OutputTab; label: string; icon: typeof MousePointer2; color: string }[] = [
  { id: "xPosts", label: "X投稿", icon: MousePointer2, color: "bg-pink-500" },
  { id: "carousel", label: "カルーセル", icon: Layout, color: "bg-cyan-400" },
  { id: "imagePrompts", label: "画像プロンプト", icon: ImageIcon, color: "bg-yellow-400" },
  { id: "canvaTexts", label: "Canva素材", icon: Type, color: "bg-indigo-500" },
];

// --- Shared: Adjust Chips ---
function AdjustChips({
  onSelect,
  disabled,
}: {
  onSelect: (prompt: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t-2 border-dashed border-slate-200">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider self-center mr-1">
        微調整:
      </span>
      {ADJUST_CHIPS.map((chip) => (
        <button
          key={chip.label}
          onClick={() => onSelect(chip.prompt)}
          disabled={disabled}
          className="px-3 py-1 text-[10px] font-black bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none hover:bg-yellow-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}

// --- Shared: Action Bar ---
function ActionBar({
  links,
  onCopy,
  copyText,
}: {
  links: { label: string; url: string; color: string }[];
  onCopy: () => void;
  copyText?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-4 p-3 bg-slate-50 border-2 border-black rounded-xl">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-1.5 px-3 py-1.5 ${link.color} text-white font-black text-xs border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all`}
        >
          <ExternalLink size={12} />
          {link.label}
        </a>
      ))}
      {copyText && (
        <button
          onClick={onCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-white font-black text-xs border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all ml-auto"
        >
          <Copy size={12} />
          全部コピー
        </button>
      )}
    </div>
  );
}

// --- Empty / Loading / Error states ---

function EmptyState() {
  return (
    <motion.div
      key="empty"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center text-center px-6 py-10"
    >
      <div className="w-20 h-20 bg-yellow-100 border-4 border-black rounded-3xl flex items-center justify-center text-yellow-600 mb-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <Sparkles size={40} />
      </div>

      <h3 className="text-xl font-black mb-2">SNS投稿をすぐ作れます</h3>
      <p className="text-sm text-slate-500 font-bold max-w-xs mb-5">
        左の入力欄に情報を入れると、投稿本文・カルーセル・画像プロンプト・Canva素材をまとめて生成します
      </p>

      {/* Example use cases */}
      <div className="w-full max-w-sm space-y-2 mb-5">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">こんな用途に使えます</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {["商品・サービス紹介", "イベント告知", "キャンペーン案内", "ノウハウ共有"].map((label) => (
            <span
              key={label}
              className="px-3 py-1.5 bg-white border-2 border-black rounded-lg text-[11px] font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* First step */}
      <div className="w-full max-w-sm p-4 bg-cyan-50 border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <p className="text-xs font-black text-cyan-700 mb-1">最初の一歩</p>
        <p className="text-[11px] font-bold text-slate-600">
          商品名と伝えたい内容を入力して「まとめて生成」を押すだけ。箇条書きやメモでもOKです。
        </p>
      </div>
    </motion.div>
  );
}

function LoadingState() {
  return (
    <motion.div
      key="loading"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col items-center justify-center p-12 space-y-8"
    >
      <div className="relative">
        <div className="w-20 h-20 border-8 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
        <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" size={32} />
      </div>
      <div className="space-y-4 w-full max-w-md">
        <div className="h-4 bg-slate-100 rounded-full overflow-hidden border-2 border-black">
          <motion.div
            className="h-full bg-pink-500"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 15, ease: "easeInOut" }}
          />
        </div>
        <p className="text-center font-black text-indigo-600 animate-pulse">
          SNSに最適なコンテンツを錬成中...
        </p>
      </div>
    </motion.div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <motion.div
      key="error"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center text-center p-12"
    >
      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center border-4 border-black mb-4">
        <AlertCircle size={32} />
      </div>
      <h3 className="text-xl font-black mb-2">エラーが発生しました</h3>
      <p className="text-sm text-slate-600 font-bold mb-6 max-w-md">{error}</p>
      <button
        onClick={onRetry}
        className="px-6 py-3 bg-pink-500 text-white font-black rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
      >
        再試行
      </button>
    </motion.div>
  );
}

// --- Tab Views ---

function XPostsView({ result, onCopy, onAdjust, adjusting }: { result: GenerateResult; onCopy: (t: string) => void; onAdjust: (target: AdjustTarget, instruction: string) => Promise<void>; adjusting: boolean }) {
  return (
    <div className="space-y-4">
      {result.xPosts.map((post, i) => {
        const cleanTags = dedupeWithBody(post.body, post.hashtags, 5);
        const fullText = `${post.body}\n\n${cleanTags.map((h) => `#${h}`).join(" ")}`;

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 bg-slate-50 border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 bg-pink-500 text-white text-xs font-black rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                {post.label}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400">{post.body.length}文字</span>
                <a
                  href={buildXPostUrl(fullText)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 bg-black text-white rounded-xl font-black text-xs border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                >
                  <ExternalLink size={12} />
                  Xで投稿
                </a>
                <button
                  onClick={() => onCopy(fullText)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-pink-500 text-white rounded-xl font-black text-xs border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                >
                  <Copy size={14} />
                  コピー
                </button>
              </div>
            </div>
            <p className="font-bold leading-relaxed whitespace-pre-wrap mb-3">{post.body}</p>
            <div className="flex flex-wrap gap-1.5">
              {cleanTags.map((tag, j) => (
                <span key={j} className="text-xs font-black px-2 py-0.5 bg-white border-2 border-black rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          </motion.div>
        );
      })}
      <AdjustChips onSelect={(p) => onAdjust("xPosts", p)} disabled={adjusting} />
    </div>
  );
}

function CarouselView({ result, onCopy }: { result: GenerateResult; onCopy: (t: string) => void }) {
  const allText = result.carousel.map((s) => `${s.title}\n${s.subtitle}\n${s.body}`).join("\n\n---\n\n");

  return (
    <div className="space-y-4">
      <ActionBar
        links={[
          { label: "Canvaを開く", url: EXTERNAL_URLS.canvaHome, color: "bg-indigo-500" },
        ]}
        onCopy={() => onCopy(allText)}
        copyText={allText}
      />
      <div className="grid grid-cols-1 gap-4">
        {result.carousel.map((slide, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-5 bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">
                スライド {slide.slideNumber}
              </span>
              <button
                onClick={() => onCopy(`${slide.title}\n${slide.subtitle}\n${slide.body}`)}
                className="p-2 bg-white border-2 border-black rounded-lg hover:bg-slate-100 transition-colors shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
              >
                <Copy size={14} />
              </button>
            </div>
            <h4 className="font-black text-base mb-0.5">{slide.title}</h4>
            <p className="text-sm font-bold text-slate-500 mb-2">{slide.subtitle}</p>
            <p className="font-bold whitespace-pre-wrap">{slide.body}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ImagePromptCopyBar({
  prompt,
  onCopy,
}: {
  prompt: { mainPrompt: string; mainPromptJa: string; subPrompt: string; negativePrompt: string; aspectRatio: string };
  onCopy: (t: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      <button
        onClick={() => onCopy(prompt.mainPrompt)}
        className="px-3 py-1.5 bg-yellow-400 text-black font-black text-[10px] border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
      >
        <Copy size={10} className="inline mr-1" />英語のみ
      </button>
      <button
        onClick={() => onCopy(prompt.mainPromptJa)}
        className="px-3 py-1.5 bg-cyan-400 text-black font-black text-[10px] border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
      >
        <Copy size={10} className="inline mr-1" />日本語訳のみ
      </button>
      <button
        onClick={() =>
          onCopy(
            `Main: ${prompt.mainPrompt}\n日本語: ${prompt.mainPromptJa}\nStyle: ${prompt.subPrompt}\nNegative: ${prompt.negativePrompt}\nAspect: ${prompt.aspectRatio}`
          )
        }
        className="px-3 py-1.5 bg-slate-700 text-white font-black text-[10px] border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
      >
        <Copy size={10} className="inline mr-1" />全部コピー
      </button>
    </div>
  );
}

function ImagePromptsView({ result, onCopy, onAdjust, adjusting }: { result: GenerateResult; onCopy: (t: string) => void; onAdjust: (target: AdjustTarget, instruction: string) => Promise<void>; adjusting: boolean }) {
  return (
    <div className="space-y-6">
      <ActionBar
        links={[
          { label: "Gemini / AI Studioを開く", url: EXTERNAL_URLS.geminiHome, color: "bg-yellow-500" },
        ]}
        onCopy={() => {
          const all = result.imagePrompts
            .map(
              (p) =>
                `[${p.label}]\nMain: ${p.mainPrompt}\n日本語: ${p.mainPromptJa}\nStyle: ${p.subPrompt}\nNegative: ${p.negativePrompt}\nAspect: ${p.aspectRatio}`
            )
            .join("\n\n---\n\n");
          onCopy(all);
        }}
        copyText="all"
      />

      <h3 className="font-black text-2xl flex items-center gap-3 italic">
        <div className="p-2 bg-yellow-400 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <ImageIcon size={28} className="text-black" />
        </div>
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-600 to-pink-600">
          Gemini IMAGE PROMPT
        </span>
      </h3>

      {result.imagePrompts.map((prompt, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 bg-yellow-400 text-black text-xs font-black rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              {prompt.label} ({prompt.aspectRatio})
            </span>
          </div>

          {/* Main Prompt (EN) */}
          <div className="relative group">
            <div className="absolute -top-3 -left-1 bg-black text-white px-3 py-1 rounded-full text-[10px] font-black z-10">
              MAIN PROMPT
            </div>
            <div className="p-6 bg-white border-4 border-black rounded-2xl font-mono text-sm font-bold shadow-[6px_6px_0px_0px_rgba(253,224,71,1)] leading-relaxed">
              {prompt.mainPrompt}
            </div>
          </div>

          {/* Japanese Translation */}
          <div className="relative group">
            <div className="absolute -top-3 -left-1 bg-cyan-500 text-white px-3 py-1 rounded-full text-[10px] font-black z-10">
              日本語訳
            </div>
            <div className="p-6 bg-cyan-50 border-4 border-black rounded-2xl text-sm font-bold shadow-[6px_6px_0px_0px_rgba(6,182,212,0.2)] leading-relaxed">
              {prompt.mainPromptJa}
            </div>
          </div>

          {/* Style Prompt */}
          <div className="relative group">
            <div className="absolute -top-3 -left-1 bg-indigo-500 text-white px-3 py-1 rounded-full text-[10px] font-black z-10">
              STYLE PROMPT
            </div>
            <div className="p-6 bg-white border-4 border-black rounded-2xl font-mono text-sm font-bold shadow-[6px_6px_0px_0px_rgba(99,102,241,0.3)] leading-relaxed">
              {prompt.subPrompt}
            </div>
          </div>

          {/* Negative Prompt */}
          <div className="relative group">
            <div className="absolute -top-3 -left-1 bg-red-500 text-white px-3 py-1 rounded-full text-[10px] font-black z-10">
              NG PROMPT
            </div>
            <div className="p-6 bg-red-50 border-4 border-black rounded-2xl font-mono text-sm font-bold shadow-[6px_6px_0px_0px_rgba(239,68,68,0.2)] leading-relaxed flex items-center gap-4">
              <AlertCircle size={20} className="text-red-500 shrink-0" />
              <span>{prompt.negativePrompt}</span>
            </div>
          </div>

          {/* Per-prompt copy bar */}
          <ImagePromptCopyBar prompt={prompt} onCopy={onCopy} />
        </motion.div>
      ))}

      <div className="p-5 bg-indigo-600 text-white border-4 border-black rounded-2xl flex items-center gap-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="w-12 h-12 bg-white text-indigo-600 rounded-xl flex items-center justify-center border-2 border-black shrink-0">
          <Sparkles size={24} />
        </div>
        <div>
          <p className="text-sm font-black uppercase tracking-wider mb-0.5">Pro Tip!</p>
          <p className="text-xs font-bold opacity-90">
            このプロンプトを画像生成AIに入力して、最高のクリエイティブを手に入れよう！
          </p>
        </div>
      </div>
      <AdjustChips onSelect={(p) => onAdjust("imagePrompts", p)} disabled={adjusting} />
    </div>
  );
}

// Canva用ラベルマッピング（C6: 用途ラベル強化）
const CANVA_SECTIONS: {
  key: keyof GenerateResult["canvaTexts"];
  title: string;
  usage: string;
  color: string;
  borderColor: string;
}[] = [
  { key: "coverTitles", title: "カバータイトル", usage: "表紙・サムネイル向け", color: "bg-pink-50", borderColor: "border-pink-300" },
  { key: "subTitles", title: "サブタイトル", usage: "見出し・小見出し向け", color: "bg-cyan-50", borderColor: "border-cyan-300" },
  { key: "highlightWords", title: "強調ワード", usage: "バナー・アクセント向け", color: "bg-yellow-50", borderColor: "border-yellow-300" },
  { key: "descriptions", title: "説明文", usage: "本文・補足テキスト向け", color: "bg-indigo-50", borderColor: "border-indigo-300" },
  { key: "ctaTexts", title: "CTA文言", usage: "ボタン・誘導テキスト向け", color: "bg-emerald-50", borderColor: "border-emerald-300" },
  { key: "badgeShortTexts", title: "バッジ・ラベル", usage: "タグ・ステッカー向け", color: "bg-orange-50", borderColor: "border-orange-300" },
];

function CanvaTextsView({ result, onCopy, onAdjust, adjusting }: { result: GenerateResult; onCopy: (t: string) => void; onAdjust: (target: AdjustTarget, instruction: string) => Promise<void>; adjusting: boolean }) {
  const allText = CANVA_SECTIONS.map((s) => `【${s.title}】\n${result.canvaTexts[s.key].join("\n")}`).join("\n\n");

  return (
    <div className="space-y-6">
      <ActionBar
        links={[
          { label: "Canvaを開く", url: EXTERNAL_URLS.canvaHome, color: "bg-indigo-500" },
        ]}
        onCopy={() => onCopy(allText)}
        copyText={allText}
      />

      <div className="flex items-center justify-between">
        <h3 className="font-black text-lg flex items-center gap-2">
          <Type size={24} className="text-indigo-500" />
          Canva 文字素材
        </h3>
      </div>

      {CANVA_SECTIONS.map(({ key, title, usage, color, borderColor }) => (
        <div key={key} className="space-y-3">
          <div className="flex items-center gap-3">
            <h4 className="text-sm font-black flex items-center gap-2">
              <div className="w-2 h-4 bg-black rounded-full" />
              {title}
            </h4>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${borderColor} ${color} text-slate-500`}>
              {usage}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {result.canvaTexts[key].map((item, i) => (
              <div
                key={i}
                className={`p-4 ${color} border-4 border-black rounded-xl flex items-center justify-between shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all group`}
              >
                <span className="font-black text-sm">{item}</span>
                <button
                  onClick={() => onCopy(item)}
                  className="p-2 bg-white border-2 border-black rounded-lg hover:bg-slate-100 transition-colors shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                >
                  <Copy size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
      <AdjustChips onSelect={(p) => onAdjust("canvaTexts", p)} disabled={adjusting} />
    </div>
  );
}

// --- Main Panel ---

export default function OutputPanel({ result, loading, error, onRetry, onCopy, onAdjust, adjusting }: OutputPanelProps) {
  const [activeTab, setActiveTab] = useState<OutputTab>("xPosts");

  return (
    <div className="bg-white rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black overflow-hidden flex flex-col min-h-[600px]">
      {/* Tabs */}
      <div className="bg-indigo-50 border-b-4 border-black p-2 flex gap-2 overflow-x-auto custom-scrollbar items-center">
        {adjusting && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-400 border-2 border-black rounded-lg text-[10px] font-black animate-pulse shrink-0">
            <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
            調整中...
          </div>
        )}
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm border-2 border-black transition-all whitespace-nowrap shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
              activeTab === tab.id
                ? `${tab.color} text-black translate-x-[1px] translate-y-[1px] shadow-none`
                : "bg-white text-black hover:bg-white/80"
            }`}
          >
            <tab.icon size={16} />
            {OUTPUT_TAB_LABELS[tab.id]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-white">
        <AnimatePresence mode="wait">
          {error ? (
            <ErrorState error={error} onRetry={onRetry} />
          ) : loading ? (
            <LoadingState />
          ) : !result ? (
            <EmptyState />
          ) : (
            <motion.div
              key={`content-${activeTab}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {activeTab === "xPosts" && <XPostsView result={result} onCopy={onCopy} onAdjust={onAdjust} adjusting={adjusting} />}
              {activeTab === "carousel" && <CarouselView result={result} onCopy={onCopy} />}
              {activeTab === "imagePrompts" && <ImagePromptsView result={result} onCopy={onCopy} onAdjust={onAdjust} adjusting={adjusting} />}
              {activeTab === "canvaTexts" && <CanvaTextsView result={result} onCopy={onCopy} onAdjust={onAdjust} adjusting={adjusting} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
