/**
 * KELIN MD — OmegaTech Kimi AI helper
 *
 * Uses OmegaTech's public Kimi endpoint. No API key is required.
 * The endpoint manages conversation context through a returned sessionId.
 */

const KIMI_URL = "https://omegatech-api.dixonomega.tech/api/ai/kimi";
// The public docs page for this route is:
// https://omegatech-api.dixonomega.tech/api.html?route=%2Fapi%2Fai%2FDeepseek
const DEEPSEEK_URL = "https://omegatech-api.dixonomega.tech/api/ai/Deepseek";
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

function extractReply(data) {
  const candidates = [
    data,
    data?.reply,
    data?.response,
    data?.message,
    data?.text,
    data?.answer,
    data?.content,
    data?.result,
    data?.data,
    data?.data?.reply,
    data?.data?.response,
    data?.data?.message,
    data?.data?.text,
    data?.data?.answer,
    data?.data?.content,
    data?.data?.result,
    data?.choices?.[0]?.message?.content,
    data?.data?.choices?.[0]?.message?.content,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
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
  const message = systemPrompt
    ? `${systemPrompt}\n\nUser message:\n${prompt}`
    : prompt;

  const body = {
    action: "chat",
    message,
  };

  const providerSessions = uid ? sessions.get(uid) || {} : {};
  const previousSessionId = providerSessions.kimi || null;
  if (previousSessionId) body.sessionId = previousSessionId;

  try {
    const data = await requestCompletion(KIMI_URL, body, "OmegaTech Kimi");
    const nextSessionId = extractSessionId(data);
    if (uid && nextSessionId) {
      sessions.set(uid, { ...providerSessions, kimi: nextSessionId });
    }

    const reply = extractReply(data);
    if (!reply) {
      throw new Error("OmegaTech Kimi returned an empty response.");
    }
    return reply;
  } catch (kimiError) {
    // Keep Akira usable when Kimi is rate-limited, unavailable, or returns an
    // invalid response. Deepseek has a separate session namespace, so never
    // send a Kimi session id to the fallback provider.
    const fallbackBody = { ...body };
    delete fallbackBody.sessionId;
    if (providerSessions.deepseek) {
      fallbackBody.sessionId = providerSessions.deepseek;
    }

    const fallbackData = await requestCompletion(
      DEEPSEEK_URL,
      fallbackBody,
      "OmegaTech Deepseek fallback"
    );
    const nextSessionId = extractSessionId(fallbackData);
    if (uid && nextSessionId) {
      sessions.set(uid, { ...providerSessions, deepseek: nextSessionId });
    }

    const reply = extractReply(fallbackData);
    if (!reply) {
      throw new Error(
        "OmegaTech Kimi failed and the Deepseek fallback returned an empty response."
      );
    }
    return reply;
  }
}

/** Clear the local session mapping so the next message starts a new chat. */
export function resetKimiSession(uid) {
  sessions.delete(uid);
}