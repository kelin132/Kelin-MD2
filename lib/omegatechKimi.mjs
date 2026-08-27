/**
 * KELIN MD — AI helper
 *
 * Uses GiftedTech's public AI endpoints via lib/gifted.js.
 */

import { aiGet } from "./gifted.js";

const BK9_URL = "https://api.bk9.site/ai/chatgpt"; // External fallback

function extractReply(data) {
  return (
    data?.result ||
    data?.reply ||
    data?.response ||
    data?.choices?.[0]?.message?.content ||
    data?.data?.result ||
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
    { name: "Omega-ChatAI", type: "fetch", url: `https://api.omegatech.app/api/ai/Chatai?message=${encodeURIComponent(prompt)}&action=chat${model ? `&model=${model}` : ""}${systemPrompt ? `&systemPrompt=${encodeURIComponent(systemPrompt)}` : ""}` },
    { name: "Omega-Claude", type: "fetch", url: `https://api.omegatech.app/api/ai/Claude?text=${encodeURIComponent(fullPrompt)}` },
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
        data = await res.json();
      }

      const reply = extractReply(data);
      if (reply && !reply.includes("429") && !reply.includes("rate limit") && !reply.includes("API Key")) {
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
