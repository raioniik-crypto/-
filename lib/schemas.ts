import { z } from "zod";

export const xPostSchema = z.object({
  label: z.string(),
  body: z.string(),
  hashtags: z.array(z.string()),
});

export const carouselSlideSchema = z.object({
  slideNumber: z.number(),
  title: z.string(),
  subtitle: z.string(),
  body: z.string(),
});

export const imagePromptSchema = z.object({
  label: z.string(),
  mainPrompt: z.string(),
  mainPromptJa: z.string(),
  subPrompt: z.string(),
  negativePrompt: z.string(),
  aspectRatio: z.string(),
});

export const canvaTextsSchema = z.object({
  coverTitles: z.array(z.string()),
  subTitles: z.array(z.string()),
  highlightWords: z.array(z.string()),
  descriptions: z.array(z.string()),
  ctaTexts: z.array(z.string()),
  badgeShortTexts: z.array(z.string()),
});

export const generateResultSchema = z.object({
  xPosts: z.array(xPostSchema),
  carousel: z.array(carouselSlideSchema),
  imagePrompts: z.array(imagePromptSchema),
  canvaTexts: canvaTextsSchema,
});

export type GenerateResultSchema = z.infer<typeof generateResultSchema>;
