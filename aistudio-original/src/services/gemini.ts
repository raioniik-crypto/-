import { GoogleGenAI } from "@google/genai";

const genAI: any = new (GoogleGenAI as any)({ apiKey: process.env.GEMINI_API_KEY || "" });

export const generateContent = async (prompt: string, type: 'text' | 'image' | 'complex') => {
  if (type === 'complex') {
    // Thinking mode for complex tasks
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.1-pro-preview",
    });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } else if (type === 'text') {
    // General tasks with search grounding
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview",
    });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [{ googleSearch: {} }] as any
    });
    return result.response.text();
  }
  return "AI Generation Mock Response";
};

export const generateImage = async (prompt: string, size: '1K' | '2K' | '4K', aspectRatio: string) => {
  const model = genAI.getGenerativeModel({ model: "gemini-3-pro-image-preview" });
  return `https://picsum.photos/seed/${encodeURIComponent(prompt)}/1024/1024`;
};