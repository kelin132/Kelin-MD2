import { getSettings } from "../lib/settingsManager.js";

export interface ApiKeyStatusItem {
  name: string;
  configured: boolean;
  working: boolean | null;
  description: string;
}

export function getApiStatus(): ApiKeyStatusItem[] {
  const settings = getSettings();
  const apiKeys = (settings as any).apiKeys ?? {};

  return [
    {
      name: "OpenAI (ChatGPT)",
      configured: !!apiKeys.openai,
      working: null,
      description: "GPT-4o for AI chat commands",
    },
    {
      name: "Google Gemini",
      configured: !!apiKeys.gemini,
      working: null,
      description: "Gemini Pro for AI generation",
    },
    {
      name: "DeepSeek AI",
      configured: !!apiKeys.deepseek,
      working: null,
      description: "DeepSeek for code generation",
    },
    {
      name: "Anthropic Claude",
      configured: !!apiKeys.claude,
      working: null,
      description: "Claude for reasoning tasks",
    },
    {
      name: "YouTube DL",
      configured: true,
      working: true,
      description: "YouTube video/audio download",
    },
    {
      name: "TikTok DL",
      configured: true,
      working: true,
      description: "TikTok video download",
    },
    {
      name: "Weather API",
      configured: !!apiKeys.weather,
      working: null,
      description: "Real-time weather data",
    },
    {
      name: "Remove BG",
      configured: !!apiKeys.removebg,
      working: null,
      description: "Background removal API",
    },
  ];
}
