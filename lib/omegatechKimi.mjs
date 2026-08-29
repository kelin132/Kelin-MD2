/**
 * KELIN MD — AI helper
 *
 * Uses GiftedTech and OmegaTech public AI endpoints.
 */

import { aiGet } from "./gifted.js";
import { princeJson, princeText } from "./princeTech.mjs";

const AGENTROUTER_URL = "https://co.agentrouter.org/v1/chat/completions";
const AGENTROUTER_MODEL = process.env.AGENTROUTER_MODEL || "kimi-k2.6";
const FREEMODEL_URL = "https://api.freemodel.dev/v1/chat/completions";
const FREEMODEL_MODEL = process.env.FREEMODEL_MODEL || "auto";
const FREEMODEL_API_KEY = process.env.FREEMODEL_API_KEY?.trim() || "";
const AGENTROUTER_API_KEY = process.env.AGENTROUTER_API_KEY?.trim() || "";
const AI_REQUEST_TIMEOUT_MS = Math.max(
  5_000,
  Number(process.env.AI_REQUEST_TIMEOUT_MS) || 12_000
);
const AI_TOTAL_TIMEOUT_MS = Math.max(
  AI_REQUEST_TIMEOUT_MS,
  Number(process.env.AI_TOTAL_TIMEOUT_MS) || 30_000
);
const PRINCE_AI_PROVIDERS = [
  { name: "PrinceGPT-4o-mini", endpoint: "ai/gpt4o-mini" },
  { name: "PrinceGPT-4", endpoint: "ai/gpt4" },
  { name: "PrinceGPT", endpoint: "ai/gpt" },
];

async function fetchJson(url, options = {}, timeoutMs = AI_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

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
    // FreeModel is an OpenAI-compatible gateway with its own model routing
    // and fallback, so it is the fastest single first attempt when configured.
    ...(FREEMODEL_API_KEY ? [{
      name: "FreeModel",
      type: "openai",
      url: FREEMODEL_URL,
    }] : []),

    // PrinceTech provides three lightweight public AI routes. Keep all three
    // in the chain so a provider-side model outage has a nearby fallback.
    ...PRINCE_AI_PROVIDERS.map((provider) => ({
      ...provider,
      type: "prince",
    })),

    // OmegaTech Specific Model Endpoints
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

    // Akira also gets the same model-specific path used by .chatgpt.
    ...(model !== "chatgpt" ? [{
      name: "Omega-ChatGPT-Fallback",
      type: "fetch",
      url: `https://omegatech-api.dixonomega.tech/api/ai/Chatai?message=${encodeURIComponent(prompt)}&action=chat&model=chatgpt${systemPrompt ? `&systemPrompt=${encodeURIComponent(systemPrompt)}` : ""}`,
    }] : []),
    
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

    // 4. AgentRouter OpenAI-compatible fallback
    ...(AGENTROUTER_API_KEY ? [{
      name: "AgentRouter",
      type: "agentrouter",
      url: AGENTROUTER_URL,
    }] : []),

    // 5. GiftedTech / DavidCyril fallbacks
    { name: "BK9", type: "fetch", url: `https://api.bk9.site/ai/chatgpt?q=${encodeURIComponent(fullPrompt)}` },
    { name: "Pollinations", type: "aiGet", endpoint: "pollinations", params: { q: fullPrompt } },
    { name: "Venice", type: "aiGet", endpoint: "venice", params: { q: fullPrompt } },
    { name: "Llama", type: "aiGet", endpoint: "llama3", params: { q: fullPrompt } },
    { name: "DavidCyril", type: "fetch", url: `https://api.davidcyriltech.my.id/ai/chatgpt?q=${encodeURIComponent(fullPrompt)}` },
  ];

  const deadline = Date.now() + AI_TOTAL_TIMEOUT_MS;
  for (const provider of providers) {
    try {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) break;
      const providerTimeoutMs = Math.min(AI_REQUEST_TIMEOUT_MS, remainingMs);
      let data;
      if (provider.type === "aiGet") {
        data = await aiGet(provider.endpoint, provider.params, providerTimeoutMs);
      } else if (provider.type === "prince") {
        data = await princeJson(
          provider.endpoint,
          { q: fullPrompt },
          { timeoutMs: providerTimeoutMs }
        );
      } else if (provider.type === "openai") {
        data = await fetchJson(provider.url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FREEMODEL_API_KEY}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            model: FREEMODEL_MODEL,
            messages: [
              ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
              { role: "user", content: prompt },
            ],
            max_tokens: 700,
          }),
        }, providerTimeoutMs);
      } else if (provider.type === "agentrouter") {
        data = await fetchJson(provider.url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${AGENTROUTER_API_KEY}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            model: AGENTROUTER_MODEL,
            messages: [
              ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
              { role: "user", content: prompt },
            ],
          }),
        }, providerTimeoutMs);
      } else {
        data = await fetchJson(provider.url, {}, providerTimeoutMs);
      }

      const reply = String(
        provider.type === "prince" ? princeText(data) : extractReply(data) || ""
      ).trim();
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
