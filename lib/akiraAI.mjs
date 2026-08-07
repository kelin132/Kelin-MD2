/**
 * KELIN MD — shared AI persona engine.
 *
 * The historical Akira module name is retained for compatibility with the
 * existing bot imports. Select another persona per deployment with AI_PERSONA.
 */

import { askClaude, resetClaudeSession } from "./freemodelAPI.mjs";
import { askPrinceGemini } from "./gemini.mjs";
import {
  buildPersonaSystemPrompt,
  getActivePersona,
} from "./aiPersonas.mjs";

// Per-persona, per-chat uid map. A persona change can never reuse another
// character's conversation history.
export const chatHistory = new Map();

export const AKIRA_SYSTEM = getActivePersona().systemPrompt;

function sessionKey(jid, persona) {
  return `${persona.key}:${jid}`;
}

function getUid(jid, persona) {
  const key = sessionKey(jid, persona);
  if (!chatHistory.has(key)) {
    chatHistory.set(key, `${persona.key}_${jid}_${Date.now()}`);
  }
  return chatHistory.get(key);
}

export function resetPersonaSession(jid) {
  for (const [key, uid] of chatHistory.entries()) {
    if (!key.endsWith(`:${jid}`)) continue;
    resetClaudeSession(uid);
    chatHistory.delete(key);
  }
}

// Backward-compatible export used by the old .akira plugin.
export const resetAkiraSession = resetPersonaSession;

function shortReplyHint(forceShort) {
  return forceShort
    ? "\n\nREPLY IN ONE SHORT SENTENCE ONLY. Stay in character."
    : "";
}

/**
 * Call the active configured persona and send its reply.
 *
 * @param {object} sock      Baileys socket
 * @param {object} msg       raw WhatsApp message
 * @param {string} userText  cleaned text to send
 */
export async function callAkira(sock, msg, userText) {
  const persona = getActivePersona();
  const jid = msg.key.remoteJid;
  const uid = getUid(jid, persona);
  const sender = msg.key.participant || msg.key.remoteJid || "";
  const forceShort = Math.random() < 0.30;
  const prompt = userText + shortReplyHint(forceShort);
  const systemPrompt = buildPersonaSystemPrompt(persona);

  await sock.sendPresenceUpdate("composing", jid);

  try {
    let reply;
    try {
      reply = await askClaude(systemPrompt, prompt, uid);
    } catch (primaryError) {
      // FreeModel is the preferred low-latency provider. If it is unavailable
      // or times out, use the PrinceTech Gemini endpoint immediately.
      try {
        reply = await askPrinceGemini(prompt, { systemPrompt, uid });
      } catch (fallbackError) {
        throw new Error(
          `AI providers unavailable: ${primaryError.message}; fallback failed: ${fallbackError.message}`,
        );
      }
    }

    await sock.sendPresenceUpdate("paused", jid);

    const isGroup = jid.endsWith("@g.us");
    const mentionList = isGroup && sender ? [sender] : [];

    await sock.sendMessage(
      jid,
      { text: reply, mentions: mentionList },
      { quoted: msg },
    );
  } catch (err) {
    await sock.sendPresenceUpdate("paused", jid);
    await sock.sendMessage(
      jid,
      {
        text:
          `*${persona.displayName}:* *pauses thoughtfully*\n\n` +
          `Something went wrong before I could respond properly.\n\n` +
          `_[Error: ${err.message}]_\n\nPlease try again.`,
      },
      { quoted: msg },
    );
  }
}
