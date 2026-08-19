/**
 * KELIN MD — OmegaTech Kimi AI helper
 *
 * Uses OmegaTech's public Kimi endpoint. No API key is required.
 * The endpoint manages conversation context through a returned sessionId.
 */

const KIMI_URL = "https://omegatech-api.dixonomega.tech/api/ai/kimi";
// The Chat-ai route exposes the DeepSeek model with a real `reply` field and
// supports systemPrompt separately. The standalone Deepseek route currently
// echoes the submitted message and returns an empty answer.
const DEEPSEEK_URL = "https://omegatech-api.dixonomega.tech/api/ai/Chatai";
const PERPLEXITY_URL =
  "https://omegatech-api.dixonomega.tech/api/ai/perplexity-ai";
const PRINCE_AI_URL = "https://api.princetechn.com/api/ai/gpt4o-mini";
const MAX_ATTEMPTS = 3;
const sessions = new Map();

function extractSessionId(data) {
  return (
    data?.sessionId ??
    data?.data?.sessionId ??
    data?.result?.sessionId ??
    data?.conversation?.sessionId ??
    null
  );
}

function extractReply(data, requestedMessage = "") {
  const candidates = [
    data?.reply,
    data?.response,
    data?.text,
    data?.answer,
    data?.content,
    data?.data?.reply,
    data?.data?.response,
    data?.data?.text,
    data?.data?.answer,
    data?.data?.content,
    data?.data?.result,
    data?.result,
    data?.choices?.[0]?.message?.content,
    data?.data?.choices?.[0]?.message?.content,
    // Some providers use `message` for the answer. Do this last because
    // OmegaTech also uses it to echo the user's submitted prompt.
    data?.message,
    data?.data?.message,
  ];

  const normalizedRequest = String(requestedMessage).trim();
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const reply = candidate.trim();
    if (reply && reply !== normalizedRequest) {
      return reply;
    }
  }

  return "";
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorDetail(data, raw) {
  return (
    data?.error ||
    data?.message ||
    data?.response ||
    raw ||
    "unknown error"
  );
}

function isRateLimited(status, detail) {
  return status === 429 || /\b429\b|rate.?limit/i.test(String(detail));
}

async function requestCompletion(url, body, label) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const raw = await res.text().catch(() => "");
    let data;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = raw;
    }

    const detail = getErrorDetail(data, raw);
    if (res.ok && data?.success !== false) return data;

    lastError = new Error(`${label} API error (${res.status}): ${detail}`);
    lastError.rateLimited = isRateLimited(res.status, detail);

    if (!lastError.rateLimited || attempt === MAX_ATTEMPTS) break;
    await wait(750 * 2 ** (attempt - 1));
  }

  throw lastError;
}

/**
 * Send a message to OmegaTech Kimi and return its text response.
 *
 * @param {string} prompt - User message
 * @param {object} [opts]
 * @param {string} [opts.uid] - Local session key, such as a WhatsApp JID
 * @param {string} [opts.systemPrompt] - Optional persona/instruction context
 * @returns {Promise<string>}
 */
export async function askKimi(prompt, opts = {}) {
  const { uid = "default", systemPrompt = null } = opts;
  const kimiMessage = systemPrompt
    ? `${systemPrompt}\n\nUser message:\n${prompt}`
    : prompt;

  const kimiBody = {
    action: "chat",
    message: kimiMessage,
  };

  const providerSessions = uid ? sessions.get(uid) || {} : {};
  const previousSessionId = providerSessions.kimi || null;
  if (previousSessionId) kimiBody.sessionId = previousSessionId;

  try {
    const data = await requestCompletion(KIMI_URL, kimiBody, "OmegaTech Kimi");
    const nextSessionId = extractSessionId(data);
    if (uid && nextSessionId) {
      sessions.set(uid, { ...providerSessions, kimi: nextSessionId });
    }

    const reply = extractReply(data, kimiMessage);
    if (!reply) {
      throw new Error("OmegaTech Kimi returned an empty response.");
    }
    return reply;
  } catch (kimiError) {
    // Keep Akira usable when Kimi is rate-limited, unavailable, or returns an
    // invalid response. Deepseek has a separate session namespace, so never
    // send a Kimi session id to the fallback provider.
    const fallbackBody = {
      action: "chat",
      model: "deepseek",
      message: prompt,
    };
    if (systemPrompt) fallbackBody.systemPrompt = systemPrompt;
    if (providerSessions.deepseek) {
      fallbackBody.sessionId = providerSessions.deepseek;
    }

    try {
      const fallbackData = await requestCompletion(
        DEEPSEEK_URL,
        fallbackBody,
        "OmegaTech Deepseek fallback"
      );
      const nextSessionId = extractSessionId(fallbackData);
      if (uid && nextSessionId) {
        sessions.set(uid, { ...providerSessions, deepseek: nextSessionId });
      }

      const reply = extractReply(fallbackData, prompt);
      if (!reply) {
        throw new Error("OmegaTech Deepseek returned an empty response.");
      }
      return reply;
    } catch (deepseekError) {
      // Perplexity is intentionally the last provider in the chain. Its
      // endpoint is stateless and only accepts a prompt, so include Akira's
      // persona in the prompt instead of sending a session id.
      const perplexityPrompt = systemPrompt
        ? `${systemPrompt}\n\nUser message:\n${prompt}`
        : prompt;

      try {
        const perplexityData = await requestCompletion(
          PERPLEXITY_URL,
          { prompt: perplexityPrompt },
          "OmegaTech Perplexity fallback"
        );
        const reply = extractReply(perplexityData, perplexityPrompt);
        if (!reply) {
          throw new Error("OmegaTech Perplexity returned an empty response.");
        }
        return reply;
      } catch (perplexityError) {
        try {
          const princeUrl = `${PRINCE_AI_URL}?apikey=prince&q=${encodeURIComponent(prompt)}`;
          const princeResponse = await fetch(princeUrl, {
            headers: { Accept: "application/json", "User-Agent": "KELIN-MD2/1.0" },
            signal: AbortSignal.timeout(45_000),
          });
          const princeRaw = await princeResponse.text();
          let princeData;
          try { princeData = princeRaw ? JSON.parse(princeRaw) : null; } catch { princeData = null; }
          const princeReply = extractReply(princeData, prompt);
          if (!princeResponse.ok || princeData?.success === false || !princeReply) {
            throw new Error(princeData?.message || `Prince Tech AI error (${princeResponse.status})`);
          }
          return princeReply;
        } catch (princeError) {
          throw new Error(
            [
              "All Akira AI providers failed.",
              `Kimi: ${kimiError.message}`,
              `Deepseek: ${deepseekError.message}`,
              `Perplexity: ${perplexityError.message}`,
              `Prince Tech: ${princeError.message}`,
            ].join(" ")
          );
        }
      }
    }
  }
}

/** Clear the local session mapping so the next message starts a new chat. */
export function resetKimiSession(uid) {
  sessions.delete(uid);
}