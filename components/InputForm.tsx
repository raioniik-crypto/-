"use client";

import { FormInput, FORM_FIELD_LABELS, FORM_PLACEHOLDERS, INITIAL_FORM } from "@/app/types";
import { SAMPLE_INPUT } from "@/lib/sample-data";

interface InputFormProps {
  form: FormInput;
  onChange: (form: FormInput) => void;
  onSubmit: () => void;
  onReset: () => void;
  loading: boolean;
}

const TEXT_FIELDS: (keyof FormInput)[] = [
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

const TEXTAREA_FIELDS: Set<keyof FormInput> = new Set([
  "overview",
  "targetPain",
  "benefit",
  "strength",
  "proof",
  "reference",
  "additionalNotes",
]);

export default function InputForm({
  form,
  onChange,
  onSubmit,
  onReset,
  loading,
}: InputFormProps) {
  const updateField = (key: keyof FormInput, value: string | number) => {
    onChange({ ...form, [key]: value });
  };

  const handleSampleFill = () => {
    onChange(SAMPLE_INPUT);
  };

  const handleReset = () => {
    onChange(INITIAL_FORM);
    onReset();
  };

  const isValid = form.productName.trim().length > 0;

  return (
    <div className="space-y-1">
      {/* Header actions */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
          入力情報
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSampleFill}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:hover:bg-violet-900/60 transition-colors"
          >
            サンプル入力
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 transition-colors"
          >
            リセット
          </button>
        </div>
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        {TEXT_FIELDS.map((key) => {
          const label = FORM_FIELD_LABELS[key];
          const placeholder = FORM_PLACEHOLDERS[key];
          const isTextarea = TEXTAREA_FIELDS.has(key);
          const isRequired = key === "productName";

          return (
            <div key={key}>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                {label}
                {isRequired && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </label>
              {isTextarea ? (
                <textarea
                  value={form[key] as string}
                  onChange={(e) => updateField(key, e.target.value)}
                  placeholder={placeholder}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none transition-shadow placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              ) : (
                <input
                  type="text"
                  value={form[key] as string}
                  onChange={(e) => updateField(key, e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-shadow placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              )}
            </div>
          );
        })}

        {/* Carousel slides number */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            {FORM_FIELD_LABELS.carouselSlides}
          </label>
          <div className="flex gap-2">
            {[3, 4, 5, 6, 7, 8, 10].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => updateField("carouselSlides", n)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                  form.carouselSlides === n
                    ? "bg-blue-500 text-white border-blue-500 shadow-sm"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-blue-300"
                }`}
              >
                {n}枚
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Submit button */}
      <div className="pt-4 sticky bottom-0 bg-gradient-to-t from-gray-50 dark:from-gray-900 pb-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!isValid || loading}
          className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-violet-500 text-white rounded-xl font-bold text-base hover:from-blue-600 hover:to-violet-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
              生成中...（30秒ほどかかります）
            </span>
          ) : (
            "コンテンツを一括生成"
          )}
        </button>
      </div>
    </div>
  );
}
