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
  const { systemPrompt = null } = opts;
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

  // Try Pollinations first
  try {
    const data = await aiGet("pollinations", { q: fullPrompt });
    const reply = extractReply(data);
    if (reply && !reply.includes("429") && !reply.includes("rate limit")) {
      return reply;
    }
    throw new Error("Pollinations returned empty or rate limited");
  } catch (err) {
    console.error("Pollinations AI failed:", err.message);
    
    // Fallback to Venice
    try {
      const data = await aiGet("venice", { q: fullPrompt });
      const reply = extractReply(data);
      if (reply && !reply.includes("429") && !reply.includes("rate limit")) {
        return reply;
      }
      throw new Error("Venice returned empty or rate limited");
    } catch (err2) {
      console.error("Venice AI failed:", err2.message);
      
      // Last resort: BK9 (stateless)
      try {
        const res = await fetch(`${BK9_URL}?q=${encodeURIComponent(fullPrompt)}`);
        const data = await res.json();
        const reply = extractReply(data);
        if (reply) return reply;
        throw new Error("BK9 returned empty");
      } catch (err3) {
        throw new Error("All AI providers failed. Please try again later.");
      }
    }
  }
}

/** Reset session - kept for compatibility, though current endpoints are stateless */
export function resetKimiSession(uid) {
  // No-op for now as we use stateless endpoints
}
