export interface Question {
  q: string;
  options: string[];
}

export interface GeneratedPrompt {
  rank: number;
  title: string;
  prompt: string;
  usecase: string;
  tips: { ai: string; reason: string };
  warning: string;
}

export interface VerificationResult {
  result: string;
  errors: string[];
  sourceFlags: string[];
  suggestions: string[];
}

export type Step = 1 | 2 | 3 | 4;
export type QuestionCount = 3 | 5 | 7 | 10;
export type PromptCount = 5 | 10 | 15;
