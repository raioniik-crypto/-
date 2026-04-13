/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Copy, 
  RefreshCw, 
  Trash2, 
  Wand2,
  Settings, 
  FileText, 
  Layout, 
  Image as ImageIcon, 
  Type, 
  CheckCircle2, 
  Info, 
  ChevronRight,
  Sparkles,
  Layers,
  MousePointer2,
  ExternalLink,
  Save,
  Menu,
  X,
  AlertCircle,
  Zap,
  Star,
  Heart,
  Smile,
  Music,
  PartyPopper,
  Maximize2,
  Monitor,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Mascot } from './components/Mascot';
import { generateContent, generateImage } from './services/gemini';

// --- Types ---
type AppStatus = 'input' | 'generating' | 'output';
type OutputTab = 'x' | 'carousel' | 'image' | 'canva';

interface FormData {
  projectName: string;
  summary: string;
  target: string;
  painPoints: string;
  value: string;
  strengths: string;
  proof: string;
  announcementType: string;
  cta: string;
  tone: string;
  purpose: string;
  keywords: string;
  ngExpressions: string;
  reference: string;
  imageDirection: string;
  imageSize: '1K' | '2K' | '4K';
  aspectRatio: string;
  carouselPages: string;
  additionalNotes: string;
  useThinkingMode: boolean;
  useHighQualityImage: boolean;
  scheduledDate: string;
  scheduledTime: string;
  xPostLength: 'short' | 'medium' | 'long';
  toneVariation: 'consistent' | 'varied';
}

// --- Constants ---
const SAMPLE_DATA: FormData = {
  projectName: "Instagram運用代行サービス「プロ・コネクト」",
  summary: "小規模事業者向けに、投稿作成の負担を減らし、集客導線を整える一気通貫サービス",
  target: "SNS運用に手が回らないひとり社長、地方の店舗オーナー",
  painPoints: "毎日投稿が続かない、デザインが素人っぽい、フォロワーは増えるが集客に繋がらない",
  value: "企画から画像制作、分析まで丸投げ可能。本業に集中できる時間を創出します",
  strengths: "現役マーケターが戦略を設計。AIとプロのデザイナーの掛け合わせで高品質・低価格を実現",
  proof: "累計100アカウント以上の支援実績。導入後3ヶ月で問い合わせ数3倍の実績あり",
  announcementType: "募集",
  cta: "プロフィール欄のリンクから無料相談を予約",
  tone: "論理的かつ親しみやすい",
  purpose: "認知拡大・問い合わせ獲得",
  keywords: "時短, 集客最大化, デザイン外注, SNS戦略",
  ngExpressions: "「絶対稼げる」などの誇大広告、専門用語の多用",
  reference: "ミニマルで清潔感のあるビジネス系アカウント",
  imageDirection: "ミニマル・清潔感・信頼感",
  imageSize: "1K",
  aspectRatio: "1:1",
  carouselPages: "7",
  additionalNotes: "初回限定の診断キャンペーンについても触れたい",
  useThinkingMode: false,
  useHighQualityImage: false,
  scheduledDate: "",
  scheduledTime: "",
  xPostLength: 'medium',
  toneVariation: 'consistent'
};

// --- Components ---

const Header = ({ 
  gimmickActive, 
  setGimmickActive, 
  feverMode, 
  setFeverMode 
}: { 
  gimmickActive: boolean, 
  setGimmickActive: (v: boolean) => void,
  feverMode: boolean,
  setFeverMode: (v: boolean) => void
}) => (
  <header className="border-b-4 border-black bg-yellow-400 sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Mascot size="sm" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 border-2 border-black rounded-full animate-ping"></div>
        </div>
        <div>
          <h1 className="text-2xl font-black text-black tracking-tight">SNS投稿生成アシスタント</h1>
          <p className="text-xs font-bold text-black/70 hidden sm:block">爆速でバズるコンテンツをまとめて作成！</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="hidden md:flex items-center gap-1.5 px-4 py-2 bg-white border-2 border-black rounded-xl font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all">
          <Layers size={16} />
          テンプレート
        </button>
        <button className="hidden md:flex items-center gap-1.5 px-4 py-2 bg-white border-2 border-black rounded-xl font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all">
          <Save size={16} />
          保存
        </button>
        <button 
          onClick={() => setGimmickActive(!gimmickActive)}
          className={`p-2 border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all ${gimmickActive ? 'bg-pink-500 text-white' : 'bg-white text-black'}`}
          title="ギミック1：パーティ"
        >
          <Zap size={20} className={gimmickActive ? 'animate-bounce' : ''} />
        </button>
        <button 
          onClick={() => setFeverMode(!feverMode)}
          className={`p-2 border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all ${feverMode ? 'bg-yellow-400 text-black animate-pulse' : 'bg-white text-black'}`}
          title="ギミック2：フィーバー"
        >
          <Music size={20} />
        </button>
        <button className="p-2 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all">
          <Settings size={20} />
        </button>
      </div>
    </div>
  </header>
);

const ProgressBar = ({ status }: { status: AppStatus }) => {
  const steps = [
    { id: 'input', label: '入力', icon: FileText },
    { id: 'generating', label: '生成', icon: RefreshCw },
    { id: 'output', label: '完了', icon: CheckCircle2 },
  ];

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <div className="relative flex justify-between">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-black -translate-y-1/2 z-0"></div>
        {steps.map((step, idx) => {
          const isActive = status === step.id;
          const isCompleted = (status === 'generating' && idx === 0) || (status === 'output' && idx <= 2);
          const Icon = step.icon;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center gap-3">
              <div className={`w-14 h-14 rounded-2xl border-4 border-black flex items-center justify-center transition-all duration-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                isActive ? 'bg-pink-500 text-white scale-110' : 
                isCompleted ? 'bg-cyan-400 text-black' : 'bg-white text-black'
              }`}>
                <Icon size={24} className={isActive && step.id === 'generating' ? 'animate-spin' : ''} />
              </div>
              <span className={`text-sm font-black uppercase tracking-tighter ${isActive ? 'text-pink-600' : 'text-black'}`}>{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const UsageGuide = () => (
  <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
    <Mascot message="こんにちは！私が投稿作成をお手伝いするよ！情報を入力してね✨" />
    <div className="flex-1 bg-cyan-100 border-4 border-black rounded-2xl p-6 flex flex-wrap gap-6 items-center justify-center text-sm font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-pink-500 border-2 border-black text-white flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">1</span>
        <span>情報をコピペ！</span>
      </div>
      <ChevronRight size={20} className="text-black hidden sm:block" />
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-indigo-500 border-2 border-black text-white flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">2</span>
        <span>ボタンをポチッ！</span>
      </div>
      <ChevronRight size={20} className="text-black hidden sm:block" />
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-yellow-400 border-2 border-black text-black flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">3</span>
        <span>コピーして投稿！</span>
      </div>
    </div>
  </div>
);

const CreatorCard = () => (
  <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group">
    <div className="absolute -top-6 -right-6 w-24 h-24 bg-pink-500/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
    <div className="relative z-10 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Mascot size="sm" className="shrink-0" />
        <div>
          <h3 className="font-black text-lg leading-tight">CREATED BY</h3>
          <p className="text-pink-600 font-black text-sm">いさむ | AI×ライティング×開発</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <a 
          href="https://x.com/isamu_freelance" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-3 bg-white border-2 border-black rounded-xl font-black text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all hover:bg-cyan-50"
        >
          <X size={16} />
          X アカウント
        </a>
        <a 
          href="https://isamu-portfolio.vercel.app" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-3 bg-indigo-500 text-white border-2 border-black rounded-xl font-black text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all hover:bg-indigo-600"
        >
          <ExternalLink size={16} />
          ポートフォリオ
        </a>
      </div>
    </div>
  </div>
);

const ResetConfirmModal = ({ isOpen, onCancel, onConfirm }: { isOpen: boolean, onCancel: () => void, onConfirm: () => void }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onCancel}
        />
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
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

const Toast = ({ message, visible }: { message: string, visible: boolean }) => (
  <AnimatePresence>
    {visible && (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 font-medium"
      >
        <CheckCircle2 size={18} className="text-emerald-400" />
        {message}
      </motion.div>
    )}
  </AnimatePresence>
);

export default function App() {
  const [status, setStatus] = useState<AppStatus>('input');
  const [activeTab, setActiveTab] = useState<OutputTab>('x');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    projectName: '', summary: '', target: '', painPoints: '', value: '', strengths: '', proof: '',
    announcementType: '募集', cta: '', tone: '親しみやすい', purpose: '販売', keywords: '',
    ngExpressions: '', reference: '', imageDirection: '写実', imageSize: '1K', aspectRatio: '1:1',
    carouselPages: '7', additionalNotes: '', useThinkingMode: false,
    useHighQualityImage: false, scheduledDate: '', scheduledTime: '',
    xPostLength: 'medium', toneVariation: 'consistent'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [gimmickActive, setGimmickActive] = useState(false);
  const [feverMode, setFeverMode] = useState(false);

  const outputRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === 'output' && outputRef.current) {
      outputRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab, status]);

  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 2000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAutoFill = () => {
    setFormData(SAMPLE_DATA);
    showToast('サンプルデータを入力しました');
  };

  const handleResetClick = () => {
    setShowResetConfirm(true);
  };

  const handleResetConfirm = () => {
    setFormData({
      projectName: '', summary: '', target: '', painPoints: '', value: '', strengths: '', proof: '',
      announcementType: '募集', cta: '', tone: '親しみやすい', purpose: '販売', keywords: '',
      ngExpressions: '', reference: '', imageDirection: '写実', imageSize: '1K', aspectRatio: '1:1',
      carouselPages: '7', additionalNotes: '', useThinkingMode: false,
      useHighQualityImage: false, scheduledDate: '', scheduledTime: '',
      xPostLength: 'medium', toneVariation: 'consistent'
    });
    setErrors({});
    setStatus('input');
    setShowResetConfirm(false);
    showToast('入力をリセットしました');
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.projectName.trim()) newErrors.projectName = '商品・サービス名を入力してください';
    if (!formData.summary.trim()) newErrors.summary = '概要を入力してください';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const [magicPaste, setMagicPaste] = useState('');
  const [showMagicPanel, setShowMagicPanel] = useState(false);

  const handleMagicAutofill = () => {
    try {
      const data = JSON.parse(magicPaste);
      setFormData(prev => ({
        ...prev,
        ...data
      }));
      showToast('魔法の力で全項目を埋めました！✨');
      setMagicPaste('');
      setShowMagicPanel(false);
    } catch (e) {
      showToast('JSONの形式が正しくないようです。AIに生成させたデータをそのまま貼り付けてね！');
    }
  };

  const aiPromptTemplate = `あなたはSNSコンテンツ生成のプロフェッショナルです。
以下の情報を元に、SNS投稿生成アシスタントに入力するためのJSONデータを作成してください。

【ユーザー情報】
[ここに情報を入力]

【出力形式】
以下のキーを持つJSONオブジェクトのみを出力してください。
{
  "projectName": "プロジェクト名",
  "summary": "内容の要約",
  "target": "ターゲット層",
  "painPoints": "ターゲットの悩み",
  "value": "提供価値",
  "strengths": "強み・特徴",
  "proof": "実績・証拠",
  "announcementType": "告知内容の種類",
  "cta": "誘導先・アクション",
  "tone": "トーン＆マナー",
  "purpose": "投稿の目的",
  "keywords": "キーワード（カンマ区切り）",
  "ngExpressions": "NG表現（カンマ区切り）",
  "reference": "参考URLやアカウント",
  "imageDirection": "画像の世界観・指示",
  "imageSize": "1K",
  "aspectRatio": "1:1",
  "carouselPages": "7",
  "additionalNotes": "追加の補足事項"
}`;

  const handleGenerate = async () => {
    if (!validate()) {
      showToast('入力内容を確認してください');
      return;
    }
    setStatus('generating');
    
    try {
      const prompt = `
        Project: ${formData.projectName}
        Summary: ${formData.summary}
        Target: ${formData.target}
        Tone: ${formData.tone}
        Purpose: ${formData.purpose}
        Keywords: ${formData.keywords}
        Schedule: ${formData.scheduledDate} ${formData.scheduledTime}
        Image Quality: ${formData.useHighQualityImage ? 'High Resolution / Advanced Model' : 'Standard'}
      `;

      if (formData.useThinkingMode) {
        await generateContent(prompt, 'complex');
      } else {
        await generateContent(prompt, 'text');
      }

      // Simulate image generation with size, aspect ratio and quality flag
      await generateImage(
        `${formData.imageDirection}${formData.useHighQualityImage ? ' (Ultra High Quality, Detailed)' : ''}`, 
        formData.imageSize, 
        formData.aspectRatio
      );

      setTimeout(() => {
        setStatus('output');
        showToast('コンテンツを生成しました');
      }, 2000);
    } catch (error) {
      console.error(error);
      setStatus('input');
      showToast('エラーが発生しました');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('クリップボードにコピーしました');
  };

  return (
    <div className={`min-h-screen font-sans text-slate-900 pb-32 transition-colors duration-500 ${feverMode ? 'bg-gradient-to-br from-pink-200 via-cyan-200 to-yellow-200 animate-gradient-xy' : 'bg-slate-50'}`}>
      {/* --- Gimmick Elements --- */}
      <AnimatePresence>
        {gimmickActive && (
          <>
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: Math.random() * window.innerWidth, 
                  y: window.innerHeight + 100,
                  rotate: 0,
                  scale: 0.5
                }}
                animate={{ 
                  y: -100, 
                  rotate: 360,
                  scale: [0.5, 1, 0.5],
                  x: (Math.random() - 0.5) * 200 + (Math.random() * window.innerWidth)
                }}
                exit={{ opacity: 0 }}
                transition={{ 
                  duration: 5 + Math.random() * 5, 
                  repeat: Infinity, 
                  ease: "linear",
                  delay: Math.random() * 5
                }}
                className="fixed z-[60] pointer-events-none text-yellow-400 opacity-40"
              >
                {i % 4 === 0 ? <Star size={32} fill="currentColor" /> : 
                 i % 4 === 1 ? <Sparkles size={24} /> : 
                 i % 4 === 2 ? <Heart size={28} fill="#ff2d55" className="text-pink-500" /> : 
                 <Smile size={30} className="text-cyan-400" />}
              </motion.div>
            ))}
          </>
        )}
      </AnimatePresence>

      <Header 
        gimmickActive={gimmickActive} 
        setGimmickActive={setGimmickActive} 
        feverMode={feverMode}
        setFeverMode={setFeverMode}
      />
      
      <main className="max-w-7xl mx-auto px-4 pt-4">
        <ProgressBar status={status} />
        <UsageGuide />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* --- Left Column: Input Area --- */}
          <div className="lg:col-span-5 space-y-6">
            {/* --- Magic Autofill & AI Prompt Section --- */}
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
                <div className={`transition-transform duration-300 ${showMagicPanel ? 'rotate-180' : ''}`}>
                  <ChevronDown size={24} className="font-black" />
                </div>
              </button>

              <AnimatePresence>
                {showMagicPanel && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 space-y-6 border-t-4 border-black bg-slate-50">
                      {/* Step 1: Copy Prompt */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs font-black">1</div>
                          <p className="font-black text-sm">AIに指示を出すプロンプトをコピー</p>
                        </div>
                        <div className="relative group">
                          <pre className="p-4 bg-white border-2 border-black rounded-xl text-[10px] font-mono overflow-x-auto whitespace-pre-wrap max-h-[150px] custom-scrollbar">
                            {aiPromptTemplate}
                          </pre>
                          <button 
                            onClick={() => {
                              copyToClipboard(aiPromptTemplate);
                              showToast('プロンプトをコピーしました！AIに貼り付けてね✨');
                            }}
                            className="absolute top-2 right-2 p-2 bg-yellow-400 border-2 border-black rounded-lg hover:scale-110 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500">
                          ※ChatGPTやGeminiにこのプロンプトを貼り付けて、[ユーザー情報]を埋めて実行してください。
                        </p>
                      </div>

                      {/* Step 2: Paste JSON */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs font-black">2</div>
                          <p className="font-black text-sm">AIが生成したJSONをここに貼り付け</p>
                        </div>
                        <textarea 
                          value={magicPaste}
                          onChange={(e) => setMagicPaste(e.target.value)}
                          placeholder='{"projectName": "...", "summary": "...", ...}'
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

            <div className="bg-white rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black overflow-hidden">
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
              
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-black">商品名 / サービス名 / 企画名</label>
                    <input 
                      type="text" name="projectName" value={formData.projectName} onChange={handleInputChange}
                      placeholder="例：Instagram運用代行サービス「プロ・コネクト」"
                      className={`w-full px-4 py-3 rounded-xl border-2 border-black focus:bg-yellow-50 outline-none transition-all font-bold ${errors.projectName ? 'border-red-500 bg-red-50' : ''}`}
                    />
                    {errors.projectName && <p className="text-xs font-bold text-red-500">{errors.projectName}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-black text-black">何の商品・企画か（概要）</label>
                    <textarea 
                      name="summary" value={formData.summary} onChange={handleInputChange}
                      placeholder="例：小規模事業者向けに、投稿作成の負担を減らし、集客導線を整える一気通貫サービス"
                      className={`w-full px-4 py-3 rounded-xl border-2 border-black focus:bg-yellow-50 outline-none transition-all font-bold min-h-[100px] ${errors.summary ? 'border-red-500 bg-red-50' : ''}`}
                    />
                    {errors.summary && <p className="text-xs font-bold text-red-500">{errors.summary}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-black text-black">ターゲット</label>
                      <input 
                        type="text" name="target" value={formData.target} onChange={handleInputChange}
                        placeholder="例：SNS運用に手が回らないひとり社長"
                        className="w-full px-4 py-3 rounded-xl border-2 border-black focus:bg-yellow-50 outline-none transition-all font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-black text-black">ターゲットの悩み</label>
                      <input 
                        type="text" name="painPoints" value={formData.painPoints} onChange={handleInputChange}
                        placeholder="例：毎日投稿が続かない、デザインが素人っぽい"
                        className="w-full px-4 py-3 rounded-xl border-2 border-black focus:bg-yellow-50 outline-none transition-all font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-black text-black">提供できる価値・ベネフィット</label>
                    <textarea 
                      name="value" value={formData.value} onChange={handleInputChange}
                      placeholder="例：企画から画像制作、分析まで丸投げ可能。本業に集中できる時間を創出します"
                      className="w-full px-4 py-3 rounded-xl border-2 border-black focus:bg-yellow-50 outline-none transition-all font-bold min-h-[100px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-black text-black">強み・差別化ポイント</label>
                      <input 
                        type="text" name="strengths" value={formData.strengths} onChange={handleInputChange}
                        placeholder="例：現役マーケターが戦略を設計。AI活用で高品質・低価格"
                        className="w-full px-4 py-3 rounded-xl border-2 border-black focus:bg-yellow-50 outline-none transition-all font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-black text-black">実績・根拠</label>
                      <input 
                        type="text" name="proof" value={formData.proof} onChange={handleInputChange}
                        placeholder="例：累計100アカウント以上の支援実績、問い合わせ数3倍の実績"
                        className="w-full px-4 py-3 rounded-xl border-2 border-black focus:bg-yellow-50 outline-none transition-all font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-black text-black">告知内容</label>
                      <select 
                        name="announcementType" value={formData.announcementType} onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border-2 border-black focus:bg-yellow-50 outline-none transition-all font-bold bg-white"
                      >
                        <option>発売</option>
                        <option>募集</option>
                        <option>案内</option>
                        <option>キャンペーン</option>
                        <option>認知拡大</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-black text-black">CTA</label>
                      <input 
                        type="text" name="cta" value={formData.cta} onChange={handleInputChange}
                        placeholder="例：プロフィール欄のリンクから無料相談を予約"
                        className="w-full px-4 py-3 rounded-xl border-2 border-black focus:bg-yellow-50 outline-none transition-all font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-black text-black">トンマナ / 文体</label>
                      <select 
                        name="tone" value={formData.tone} onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border-2 border-black focus:bg-yellow-50 outline-none transition-all font-bold bg-white"
                      >
                        <option>親しみやすい</option>
                        <option>高級感</option>
                        <option>論理的</option>
                        <option>熱量高め</option>
                        <option>ミニマル</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-black text-black">投稿の目的</label>
                      <select 
                        name="purpose" value={formData.purpose} onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border-2 border-black focus:bg-yellow-50 outline-none transition-all font-bold bg-white"
                      >
                        <option>販売</option>
                        <option>認知</option>
                        <option>フォロー獲得</option>
                        <option>クリック誘導</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-black text-black">キーワード / NG表現</label>
                    <div className="grid grid-cols-2 gap-4">
                      <input 
                        type="text" name="keywords" value={formData.keywords} onChange={handleInputChange}
                        placeholder="例：時短, 集客最大化"
                        className="w-full px-4 py-3 rounded-xl border-2 border-black focus:bg-yellow-50 outline-none transition-all font-bold"
                      />
                      <input 
                        type="text" name="ngExpressions" value={formData.ngExpressions} onChange={handleInputChange}
                        placeholder="例：誇大広告、専門用語"
                        className="w-full px-4 py-3 rounded-xl border-2 border-black focus:bg-yellow-50 outline-none transition-all font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-black text-black">参考にしたい投稿や雰囲気メモ</label>
                    <input 
                      type="text" name="reference" value={formData.reference} onChange={handleInputChange}
                      placeholder="例：ミニマルで清潔感のあるビジネス系アカウント"
                      className="w-full px-4 py-3 rounded-xl border-2 border-black focus:bg-yellow-50 outline-none transition-all font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-black text-black">画像の方向性</label>
                    <div className="flex flex-wrap gap-2">
                      {['写実', 'イラスト', 'ミニマル', '未来感', '高級感', 'ポップ'].map(opt => (
                        <button 
                          key={opt}
                          onClick={() => setFormData(prev => ({ ...prev, imageDirection: opt }))}
                          className={`px-4 py-2 rounded-xl text-xs font-black transition-all border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                            formData.imageDirection === opt 
                            ? 'bg-pink-500 text-white translate-x-[1px] translate-y-[1px] shadow-none' 
                            : 'bg-white text-black hover:bg-yellow-100'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-black text-black flex items-center gap-2">
                        <Maximize2 size={16} />
                        画像サイズ
                      </label>
                      <select 
                        name="imageSize" value={formData.imageSize} onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border-2 border-black focus:bg-yellow-50 outline-none transition-all font-bold bg-white"
                      >
                        <option value="1K">1K (1024x1024)</option>
                        <option value="2K">2K (2048x2048)</option>
                        <option value="4K">4K (4096x4096)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-black text-black flex items-center gap-2">
                        <Monitor size={16} />
                        アスペクト比
                      </label>
                      <select 
                        name="aspectRatio" value={formData.aspectRatio} onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border-2 border-black focus:bg-yellow-50 outline-none transition-all font-bold bg-white"
                      >
                        {['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'].map(ratio => (
                          <option key={ratio} value={ratio}>{ratio}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-black text-black">カルーセル枚数: {formData.carouselPages}枚</label>
                    <div className="px-2 py-4">
                      <input 
                        type="range" min="3" max="10" step="1"
                        name="carouselPages" value={formData.carouselPages} onChange={handleInputChange}
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

                  {/* --- Advanced Settings Section --- */}
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
                          initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                          className="overflow-hidden bg-white"
                        >
                          <div className="p-4 space-y-4 border-t-4 border-black">
                            <div className="space-y-2">
                              <label className="text-xs font-black text-black">X投稿の長さ</label>
                              <div className="grid grid-cols-3 gap-2">
                                {['short', 'medium', 'long'].map(len => (
                                  <button 
                                    key={len}
                                    onClick={() => setFormData(prev => ({ ...prev, xPostLength: len as any }))}
                                    className={`py-2 rounded-lg text-[10px] font-black border-2 border-black transition-all ${
                                      formData.xPostLength === len ? 'bg-pink-500 text-white' : 'bg-white text-black'
                                    }`}
                                  >
                                    {len === 'short' ? '短め' : len === 'medium' ? '標準' : '長め'}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-xs font-black text-black">トーンのバリエーション</label>
                              <div className="grid grid-cols-2 gap-2">
                                {[
                                  { id: 'consistent', label: '統一する' },
                                  { id: 'varied', label: '媒体別に変える' }
                                ].map(opt => (
                                  <button 
                                    key={opt.id}
                                    onClick={() => setFormData(prev => ({ ...prev, toneVariation: opt.id as any }))}
                                    className={`py-2 rounded-lg text-[10px] font-black border-2 border-black transition-all ${
                                      formData.toneVariation === opt.id ? 'bg-indigo-500 text-white' : 'bg-white text-black'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>

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

                  <div className="space-y-2">
                    <label className="text-sm font-black text-black">追加メモ</label>
                    <textarea 
                      name="additionalNotes" value={formData.additionalNotes} onChange={handleInputChange}
                      placeholder="例：初回限定の診断キャンペーンについても触れたい"
                      className="w-full px-4 py-3 rounded-xl border-2 border-black focus:bg-yellow-50 outline-none transition-all font-bold min-h-[80px]"
                    />
                  </div>

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
                      onClick={() => setFormData(prev => ({ ...prev, useThinkingMode: !prev.useThinkingMode }))}
                      className={`w-14 h-8 rounded-full border-4 border-black relative transition-all ${formData.useThinkingMode ? 'bg-indigo-500' : 'bg-slate-200'}`}
                    >
                      <motion.div 
                        animate={{ x: formData.useThinkingMode ? 24 : 0 }}
                        className="absolute top-0.5 left-0.5 w-5 h-5 bg-white border-2 border-black rounded-full"
                      />
                    </button>
                  </div>

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
                      onClick={() => setFormData(prev => ({ ...prev, useHighQualityImage: !prev.useHighQualityImage }))}
                      className={`w-14 h-8 rounded-full border-4 border-black relative transition-all ${formData.useHighQualityImage ? 'bg-cyan-500' : 'bg-slate-200'}`}
                    >
                      <motion.div 
                        animate={{ x: formData.useHighQualityImage ? 24 : 0 }}
                        className="absolute top-0.5 left-0.5 w-5 h-5 bg-white border-2 border-black rounded-full"
                      />
                    </button>
                  </div>

                  <div className="p-5 bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-pink-500 text-white rounded-lg border-2 border-black">
                        <Zap size={20} />
                      </div>
                      <p className="text-sm font-black">投稿予約設定 (Optional)</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">予約日</label>
                        <input 
                          type="date" 
                          name="scheduledDate" 
                          value={formData.scheduledDate} 
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 bg-slate-50 border-2 border-black rounded-xl font-bold text-xs outline-none focus:bg-white transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">予約時間</label>
                        <input 
                          type="time" 
                          name="scheduledTime" 
                          value={formData.scheduledTime} 
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 bg-slate-50 border-2 border-black rounded-xl font-bold text-xs outline-none focus:bg-white transition-all"
                        />
                      </div>
                    </div>
                    {formData.scheduledDate && formData.scheduledTime && (
                      <div className="p-2 bg-pink-50 border-2 border-black rounded-lg flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-pink-500" />
                        <span className="text-[10px] font-black text-pink-600">
                          {formData.scheduledDate} {formData.scheduledTime} に予約されます
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-indigo-50 border-t-4 border-black flex items-center gap-3">
                <button 
                  onClick={handleGenerate}
                  disabled={status === 'generating'}
                  className="flex-1 bg-pink-500 hover:bg-pink-600 disabled:bg-pink-300 text-white font-black py-4 rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] border-2 border-black transition-all flex items-center justify-center gap-2 group hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                >
                  {status === 'generating' ? (
                    <>
                      <RefreshCw size={24} className="animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Send size={24} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      まとめて生成
                    </>
                  )}
                </button>
                <button 
                  onClick={handleResetClick}
                  className="p-4 bg-white text-black hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                  title="リセット"
                >
                  <Trash2 size={24} />
                </button>
              </div>
            </div>

            <div className="bg-yellow-100 border-4 border-black rounded-3xl p-5 flex gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="w-10 h-10 bg-yellow-400 border-2 border-black rounded-full flex items-center justify-center shrink-0">
                <Info size={20} className="text-black" />
              </div>
              <div className="text-xs text-black leading-relaxed font-bold">
                <p className="text-sm font-black mb-1">ご利用上の注意</p>
                <p>生成結果はAIによる提案です。必ず内容を調整・確認した上で投稿してください。特に実績や数値、規約に抵触する表現がないか最終チェックをお願いします。</p>
              </div>
            </div>

            <CreatorCard />
          </div>

          {/* --- Right Column: Output Area --- */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black overflow-hidden flex flex-col h-full min-h-[600px]">
              {/* Tabs */}
              <div className="bg-indigo-50 border-b-4 border-black p-2 flex gap-2 overflow-x-auto custom-scrollbar">
                {[
                  { id: 'x', label: 'X投稿', icon: MousePointer2, color: 'bg-pink-500' },
                  { id: 'carousel', label: 'カルーセル', icon: Layout, color: 'bg-cyan-400' },
                  { id: 'image', label: '画像プロンプト', icon: ImageIcon, color: 'bg-yellow-400' },
                  { id: 'canva', label: 'Canva素材', icon: Type, color: 'bg-indigo-500' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as OutputTab)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm border-2 border-black transition-all whitespace-nowrap shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                      activeTab === tab.id 
                      ? `${tab.color} text-black translate-x-[1px] translate-y-[1px] shadow-none` 
                      : 'bg-white text-black hover:bg-white/80'
                    }`}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-white" ref={outputRef}>
                <AnimatePresence mode="wait">
                  {status === 'input' ? (
                    <motion.div 
                      key="empty"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="h-full flex flex-col items-center justify-center text-center p-12"
                    >
                      <div className="w-24 h-24 bg-yellow-100 border-4 border-black rounded-3xl flex items-center justify-center text-yellow-600 mb-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                        <Sparkles size={48} />
                      </div>
                      <h3 className="text-2xl font-black mb-3">準備万端です！</h3>
                      <p className="text-slate-500 font-bold max-w-sm">左側のフォームを入力して「まとめて生成」ボタンを押すと、ここにコンテンツが表示されます。</p>
                    </motion.div>
                  ) : status === 'generating' ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="h-full flex flex-col items-center justify-center p-12 space-y-8"
                    >
                      <div className="relative">
                        <div className="w-20 h-20 border-8 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                        <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" size={32} />
                      </div>
                      <div className="space-y-4 w-full max-w-md">
                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden border-2 border-black">
                          <motion.div 
                            className="h-full bg-pink-500"
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 2, ease: "easeInOut" }}
                          />
                        </div>
                        <p className="text-center font-black text-indigo-600 animate-pulse">SNSに最適なコンテンツを錬成中...</p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="content"
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      className="space-y-8"
                    >
                      {/* X Post Section */}
                      {activeTab === 'x' && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="font-black text-lg flex items-center gap-2">
                              <MousePointer2 size={24} className="text-pink-500" />
                              X（旧Twitter）投稿本文
                            </h3>
                            <div className="flex gap-2">
                              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" title="再生成">
                                <RefreshCw size={18} />
                              </button>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText("【SNS運用、まだ消耗してる？】\n\n「毎日投稿が続かない…」\n「デザインが素人っぽい…」\n\nそんな悩み、プロ・コネクトが解決します！🚀\n\n現役マーケターが戦略から制作まで丸投げOK。\n今なら初回限定で「アカウント無料診断」実施中！👇\n\n#SNS運用 #Instagram集客");
                                  showToast('クリップボードにコピーしました');
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-xl font-black text-sm border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                              >
                                <Copy size={18} />
                                コピー
                              </button>
                            </div>
                          </div>
                          <div className="p-6 bg-slate-50 border-4 border-black rounded-2xl font-bold leading-relaxed whitespace-pre-wrap shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            {"【SNS運用、まだ消耗してる？】\n\n「毎日投稿が続かない…」\n「デザインが素人っぽい…」\n\nそんな悩み、プロ・コネクトが解決します！🚀\n\n現役マーケターが戦略から制作まで丸投げOK。\n今なら初回限定で「アカウント無料診断」実施中！👇\n\n#SNS運用 #Instagram集客"}
                          </div>
                        </div>
                      )}

                      {/* Carousel Section */}
                      {activeTab === 'carousel' && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="font-black text-lg flex items-center gap-2">
                              <Layout size={24} className="text-cyan-500" />
                              カルーセル投稿用文言
                            </h3>
                            <div className="flex gap-2">
                              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" title="再生成">
                                <RefreshCw size={18} />
                              </button>
                              <button 
                                onClick={() => {
                                  const slides = [
                                    { title: '1. 表紙', content: 'SNS運用で「損」してない？\nプロが教える爆速集客術' },
                                    { title: '2. 悩み共感', content: '・投稿が続かない\n・フォロワーが増えない\n・デザインが苦手' },
                                    { title: '3. 解決策提示', content: 'その悩み、丸投げで解決！\n「プロ・コネクト」の強み' },
                                    { title: '4. サービス詳細', content: '戦略設計から画像制作まで\n一気通貫でサポート' },
                                    { title: '5. 実績紹介', content: '累計100社以上の支援実績\n問い合わせ数300%UPも！' },
                                    { title: '6. 特典案内', content: '今だけ！無料アカウント診断\n実施中（限定5名）' },
                                    { title: '7. まとめ/CTA', content: '詳細はプロフのリンクへ！\n今すぐチェック👇' },
                                    { title: '8. 補足', content: '保存して後で見返す' },
                                    { title: '9. 補足2', content: 'いいねで応援！' },
                                    { title: '10. 最後の挨拶', content: 'フォローして最新情報をGET' },
                                  ].slice(0, parseInt(formData.carouselPages));
                                  const text = slides.map(s => `${s.title}\n${s.content}`).join('\n\n---\n\n');
                                  copyToClipboard(text);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-cyan-400 text-black rounded-xl font-black text-sm border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                              >
                                <Copy size={18} />
                                全てコピー
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-4">
                            {[
                              { title: '1. 表紙', content: 'SNS運用で「損」してない？\nプロが教える爆速集客術' },
                              { title: '2. 悩み共感', content: '・投稿が続かない\n・フォロワーが増えない\n・デザインが苦手' },
                              { title: '3. 解決策提示', content: 'その悩み、丸投げで解決！\n「プロ・コネクト」の強み' },
                              { title: '4. サービス詳細', content: '戦略設計から画像制作まで\n一気通貫でサポート' },
                              { title: '5. 実績紹介', content: '累計100社以上の支援実績\n問い合わせ数300%UPも！' },
                              { title: '6. 特典案内', content: '今だけ！無料アカウント診断\n実施中（限定5名）' },
                              { title: '7. まとめ/CTA', content: '詳細はプロフのリンクへ！\n今すぐチェック👇' },
                              { title: '8. 補足', content: '保存して後で見返す' },
                              { title: '9. 補足2', content: 'いいねで応援！' },
                              { title: '10. 最後の挨拶', content: 'フォローして最新情報をGET' },
                            ].slice(0, parseInt(formData.carouselPages)).map((slide, i) => (
                              <div key={i} className="p-5 bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                <div className="text-xs font-black text-indigo-600 mb-2 uppercase tracking-widest">{slide.title}</div>
                                <div className="font-bold whitespace-pre-wrap">{slide.content}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Image Prompt Section */}
                      {activeTab === 'image' && (
                        <div className="space-y-6 relative">
                          {/* Decorative elements */}
                          <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            className="absolute -top-10 -right-10 text-yellow-400/20 pointer-events-none"
                          >
                            <Star size={120} fill="currentColor" />
                          </motion.div>

                          <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            {[...Array(6)].map((_, i) => (
                              <motion.div
                                key={i}
                                animate={{
                                  y: [0, -20, 0],
                                  opacity: [0.2, 0.5, 0.2],
                                }}
                                transition={{
                                  duration: 3 + i,
                                  repeat: Infinity,
                                  delay: i * 0.5,
                                  ease: "easeInOut"
                                }}
                                className="absolute w-3 h-3 rounded-full bg-pink-400/20"
                                style={{
                                  top: `${20 + i * 15}%`,
                                  left: `${10 + i * 15}%`,
                                }}
                              />
                            ))}
                          </div>

                          <div className="flex items-center justify-between relative z-10">
                            <h3 className="font-black text-2xl flex items-center gap-3 italic">
                              <div className="p-2 bg-yellow-400 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                <ImageIcon size={28} className="text-black" />
                              </div>
                              <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-600 to-pink-600">
                                Gemini IMAGE PROMPT
                              </span>
                            </h3>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                  showToast('プロンプトを再生成しました（モック）');
                                }}
                                className="p-3 bg-white border-4 border-black rounded-2xl hover:bg-slate-100 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                                title="再生成"
                              >
                                <RefreshCw size={20} />
                              </button>
                              <button 
                                onClick={() => {
                                  copyToClipboard("A professional workspace with a laptop, coffee, and a smartphone showing a vibrant Instagram feed. Minimalist and clean aesthetic, high-quality photography, soft natural lighting, 4k resolution.");
                                }}
                                className="flex items-center gap-2 px-6 py-3 bg-yellow-400 text-black rounded-2xl font-black text-sm border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all active:scale-95 group"
                              >
                                <Copy size={20} className="group-hover:rotate-12 transition-transform" />
                                プロンプトをコピー
                              </button>
                            </div>
                          </div>
                          
                          <div className="space-y-6 relative z-10">
                            <motion.div 
                              whileHover={{ scale: 1.02, rotate: -0.5 }}
                              className="relative group"
                            >
                              <div className="absolute -top-4 -left-2 bg-black text-white px-4 py-1.5 rounded-full text-xs font-black z-10 shadow-[4px_4px_0px_0px_rgba(253,224,71,1)] border-2 border-white">
                                🚀 MAIN PROMPT
                              </div>
                              <div className="p-10 bg-white border-4 border-black rounded-[2.5rem] font-mono text-base font-bold shadow-[10px_10px_0px_0px_rgba(253,224,71,1)] leading-relaxed relative overflow-hidden group-hover:shadow-[14px_14px_0px_0px_rgba(253,224,71,1)] transition-all">
                                <div className="absolute -bottom-10 -right-10 p-4 opacity-5 group-hover:opacity-20 transition-opacity duration-500">
                                  <ImageIcon size={200} />
                                </div>
                                <div className="absolute top-4 right-6 flex gap-1">
                                  <div className="w-3 h-3 rounded-full bg-red-400 border border-black group-hover:scale-125 transition-transform"></div>
                                  <div className="w-3 h-3 rounded-full bg-yellow-400 border border-black group-hover:scale-125 transition-transform delay-75"></div>
                                  <div className="w-3 h-3 rounded-full bg-green-400 border border-black group-hover:scale-125 transition-transform delay-150"></div>
                                </div>
                                <span className="relative z-10 block mt-4 group-hover:text-yellow-700 transition-colors">
                                  {"A professional workspace with a laptop, coffee, and a smartphone showing a vibrant Instagram feed. Minimalist and clean aesthetic, high-quality photography, soft natural lighting, 4k resolution."}
                                </span>
                              </div>
                            </motion.div>

                            <motion.div 
                              whileHover={{ scale: 1.02, rotate: 0.5 }}
                              className="relative group"
                            >
                              <div className="absolute -top-4 -left-2 bg-red-500 text-white px-4 py-1.5 rounded-full text-xs font-black z-10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-white">
                                🚫 NG要素 (Negative Prompt)
                              </div>
                              <div className="p-8 bg-red-50 border-4 border-black rounded-[2rem] font-bold shadow-[8px_8px_0px_0px_rgba(239,68,68,0.2)] flex items-center justify-between group-hover:bg-red-100 group-hover:shadow-[10px_10px_0px_0px_rgba(239,68,68,0.3)] transition-all">
                                <div className="flex items-center gap-4 text-red-600">
                                  <div className="p-2 bg-white border-2 border-black rounded-lg group-hover:rotate-12 transition-transform">
                                    <AlertCircle size={24} />
                                  </div>
                                  <span className="text-lg">過度な写実性、不自然な色彩、ぼやけた背景</span>
                                </div>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => showToast('NG要素を再生成しました（モック）')}
                                    className="p-3 bg-white border-2 border-black rounded-xl hover:bg-slate-100 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                                  >
                                    <RefreshCw size={20} />
                                  </button>
                                  <button 
                                    onClick={() => copyToClipboard("過度な写実性、不自然な色彩、ぼやけた背景")}
                                    className="p-3 bg-white border-2 border-black rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                                  >
                                    <Copy size={20} />
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          </div>

                          <motion.div 
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            whileHover={{ y: -5 }}
                            className="p-5 bg-indigo-600 text-white border-4 border-black rounded-2xl flex items-center gap-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                          >
                            <div className="w-12 h-12 bg-white text-indigo-600 rounded-xl flex items-center justify-center border-2 border-black shrink-0 animate-pulse">
                              <Sparkles size={24} />
                            </div>
                            <div>
                              <p className="text-sm font-black uppercase tracking-wider mb-0.5">Pro Tip!</p>
                              <p className="text-xs font-bold opacity-90">
                                このプロンプトを画像生成AIに入力して、最高のクリエイティブを手に入れよう！✨
                              </p>
                            </div>
                          </motion.div>
                        </div>
                      )}

                      {/* Canva Assets Section */}
                      {activeTab === 'canva' && (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <h3 className="font-black text-lg flex items-center gap-2">
                              <Type size={24} className="text-indigo-500" />
                              Canva 文字素材
                            </h3>
                            <button 
                              onClick={() => {
                                copyToClipboard("SNS運用, 爆速集客術, プロ・コネクト, 無料診断, 実績多数, 今すぐチェック, あなたのSNS、まだ消耗してる？, 毎日投稿が続かない悩みを解決, 累計100社以上の支援実績あり, プロフィール欄のリンクから今すぐ無料相談を予約！");
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl font-black text-sm border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                            >
                              <Copy size={18} />
                              全てコピー
                            </button>
                          </div>

                          <div className="space-y-6">
                            {[
                              { 
                                title: '短い（バナー用・タグ）', 
                                items: ['SNS運用', '爆速集客術', 'プロ・コネクト', '無料診断', '実績多数', '今すぐチェック'],
                                color: 'bg-pink-50'
                              },
                              { 
                                title: '中くらい（見出し・キャッチコピー）', 
                                items: ['あなたのSNS、まだ消耗してる？', '毎日投稿が続かない悩みを解決', '累計100社以上の支援実績あり', '【保存版】SNS運用の極意'],
                                color: 'bg-cyan-50'
                              },
                              { 
                                title: '長い（説明文・CTA）', 
                                items: ['プロフィール欄のリンクから今すぐ無料相談を予約！', '現役マーケターが戦略から制作まで丸投げOK。', '今なら期間限定で「SNS完全攻略ガイド」をプレゼント中！'],
                                color: 'bg-yellow-50'
                              }
                            ].map((group, idx) => (
                              <div key={idx} className="space-y-3">
                                <h4 className="text-sm font-black flex items-center gap-2">
                                  <div className="w-2 h-4 bg-black rounded-full"></div>
                                  {group.title}
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {group.items.map((asset, i) => (
                                    <div key={i} className={`p-4 ${group.color} border-4 border-black rounded-xl flex items-center justify-between shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all group`}>
                                      <span className="font-black text-sm">{asset}</span>
                                      <button 
                                        onClick={() => copyToClipboard(asset)}
                                        className="p-2 bg-white border-2 border-black rounded-lg hover:bg-slate-100 transition-colors shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                                      >
                                        <Copy size={14} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Toast visible={toast.visible} message={toast.message} />
      <ResetConfirmModal 
        isOpen={showResetConfirm} 
        onCancel={() => setShowResetConfirm(false)} 
        onConfirm={handleResetConfirm} 
      />
      
      {/* Footer / Status Bar */}
      <footer className="fixed bottom-0 left-0 w-full bg-white border-t-4 border-black py-4 px-6 z-40 shadow-[0_-4px_0_0_rgba(0,0,0,1)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-[10px] font-black">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-cyan-400 border border-black animate-pulse"></div> SYSTEM ONLINE</span>
            <span className="bg-yellow-400 px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">VERSION 1.1.0-POP</span>
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-2">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Creator</span>
              <div className="flex items-center gap-2 px-3 py-1 bg-pink-50 border-2 border-black rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Smile size={12} className="text-pink-500" />
                <span className="text-xs font-black">いさむ | AI×ライティング×開発</span>
              </div>
              <div className="flex gap-2">
                <a href="https://x.com/isamu_freelance" target="_blank" rel="noopener noreferrer" className="p-1.5 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all">
                  <X size={12} />
                </a>
                <a href="https://isamu-portfolio.vercel.app" target="_blank" rel="noopener noreferrer" className="p-1.5 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all">
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
              © 2026 SNS投稿生成アシスタント - All Rights Reserved.
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes gradient-xy {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-xy {
          background-size: 400% 400%;
          animation: gradient-xy 15s ease infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #000;
          border-radius: 0px;
          border: 2px solid #f1f5f9;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #333;
        }
      `}</style>
    </div>
  );
}