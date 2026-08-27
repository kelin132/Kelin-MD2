/**
 * KELIN MD — AI helper
 *
 * Uses GiftedTech and OmegaTech public AI endpoints.
 */

import { aiGet } from "./gifted.js";

const BK9_URL = "https://api.bk9.site/ai/chatgpt"; // External fallback

function extractReply(data) {
  if (typeof data === "string") return data;
  return (
    data?.result ||
    data?.reply ||
    data?.response ||
    data?.choices?.[0]?.message?.content ||
    data?.data?.result ||
    data?.data?.response ||
    data?.content ||
    ""
  );
}

/**
 * Send a message to the AI and return its text response.
 *
 * @param {string} prompt - User message
 * @param {object} [opts]
 * @param {string} [opts.uid] - Local session key
 * @param {string} [opts.systemPrompt] - Optional persona/instruction context
 * @returns {Promise<string>}
 */
export async function askKimi(prompt, opts = {}) {
  const { systemPrompt = null, model = null } = opts;
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

  const providers = [
    // 1. OmegaTech Specific Model Endpoints
    ...(model === "claude" ? [{ 
      name: "Omega-Claude", 
      type: "fetch", 
      url: `https://omegatech-api.dixonomega.tech/api/ai/Claude?text=${encodeURIComponent(fullPrompt)}` 
    }] : []),
    ...(model === "gemini" ? [{ 
      name: "Omega-Gemini", 
      type: "fetch", 
      url: `https://omegatech-api.dixonomega.tech/api/ai/Gemini?text=${encodeURIComponent(fullPrompt)}` 
    }] : []),
    
    // 2. OmegaTech Chatai (Primary General Purpose)
    { 
      name: "Omega-ChatAI", 
      type: "fetch", 
      url: `https://omegatech-api.dixonomega.tech/api/ai/Chatai?message=${encodeURIComponent(prompt)}&action=chat${model ? `&model=${model}` : ""}${systemPrompt ? `&systemPrompt=${encodeURIComponent(systemPrompt)}` : ""}` 
    },
    
    // 3. OmegaTech Fallbacks (if not already tried)
    ...(model !== "claude" ? [{ 
      name: "Omega-Claude-Fallback", 
      type: "fetch", 
      url: `https://omegatech-api.dixonomega.tech/api/ai/Claude?text=${encodeURIComponent(fullPrompt)}` 
    }] : []),
    ...(model !== "gemini" ? [{ 
      name: "Omega-Gemini-Fallback", 
      type: "fetch", 
      url: `https://omegatech-api.dixonomega.tech/api/ai/Gemini?text=${encodeURIComponent(fullPrompt)}` 
    }] : []),

    // 4. GiftedTech / DavidCyril fallbacks
    { name: "BK9", type: "fetch", url: `https://api.bk9.site/ai/chatgpt?q=${encodeURIComponent(fullPrompt)}` },
    { name: "Pollinations", type: "aiGet", endpoint: "pollinations", params: { q: fullPrompt } },
    { name: "Venice", type: "aiGet", endpoint: "venice", params: { q: fullPrompt } },
    { name: "Llama", type: "aiGet", endpoint: "llama3", params: { q: fullPrompt } },
    { name: "DavidCyril", type: "fetch", url: `https://api.davidcyriltech.my.id/ai/chatgpt?q=${encodeURIComponent(fullPrompt)}` },
  ];

  for (const provider of providers) {
    try {
      let data;
      if (provider.type === "aiGet") {
        data = await aiGet(provider.endpoint, provider.params);
      } else {
        const res = await fetch(provider.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();
      }

      const reply = extractReply(data);
      if (reply && !reply.includes("429") && !reply.includes("rate limit") && !reply.includes("API Key") && !reply.includes("Error")) {
        return reply;
      }
    } catch (err) {
      console.error(`${provider.name} AI failed:`, err.message);
    }
  }

  throw new Error("All AI providers failed. Please try again later.");
}

/** Reset session - kept for compatibility, though current endpoints are stateless */
export function resetKimiSession(uid) {
  // No-op for now as we use stateless endpoints
}
