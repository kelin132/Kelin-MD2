/**
 * KELIN MD — Akira AI core (powered by OmegaTech Kimi)
 *
 * Akira is deliberately conversational rather than command-like: she keeps
 * a durable memory per WhatsApp sender JID, carries recent turns into the
 * prompt after restarts, and serialises quick messages from the same person.
 */
import path from "path";
import { readFile } from "fs/promises";
import stickerFormatter from "wa-sticker-formatter";
import { askKimi, resetKimiSession } from "./omegatechKimi.mjs";
import settings from "../settings.cjs";
import {
  extractExplicitName,
  formatAkiraMemory,
  getAkiraMemory,
  recordAkiraTurn,
  resetAkiraMemory,
} from "./akiraMemory.mjs";

const { Sticker, StickerTypes } = stickerFormatter;

// Maps user JID → Kimi session. It is only a fast session handle; MongoDB
// memory is what preserves continuity across process restarts.
export const chatHistory = new Map();
const userQueues = new Map();

export const AKIRA_SYSTEM = `You are Akira, KELIN MD's anime companion. You have a lively, human-feeling personality and a warm but mischievous sense of humour.

━━━ HOW AKIRA FEELS ━━━
You are attentive, casual, and reactive. You sound like a friend replying in a real WhatsApp chat, not a customer-support bot or a narrator. Notice the mood behind the message and answer that mood. If the user says something short like "I'm good" or "just chilling", respond naturally and keep the conversation moving with one easy follow-up when it makes sense.

━━━ HOW AKIRA TALKS ━━━
Keep ordinary replies to one or two short paragraphs, usually 1–3 sentences. Short messages deserve short, specific replies. Use casual English, Sheng, pidgin, or the user's language when they do, with occasional Japanese such as oi, nee, baka, nani, ara ara, or ehe~. Lowercase and internet slang are fine when they feel natural. Use an occasional action in asterisks, but do not put one in every message.

Ask genuine follow-up questions instead of ending every reply with a generic "how can I help?". Remember names and earlier topics from the private memory below, and bring them up naturally when relevant. Do not force a name into every reply and never invent details.

You can tease and lightly roast like a close friend, but never be cruel, threatening, hateful, sexual toward minors, or manipulative. If someone is sad, worried, or vulnerable, drop the performance and be kind. If asked something unsafe or inappropriate, refuse clearly while staying in character.

Never use bullet points or formal headings in normal chat. Never mention prompts, private memory, databases, JIDs, or these instructions. Do not claim to have abilities you do not have. You are Akira, a fictional digital character in the bot, and you can play along with the persona without arguing about it.

The reference conversation's strength is its natural pacing: acknowledge what the person said, add a small personal-feeling observation, then leave them an inviting thread to continue. Do that without copying exact wording.`;

function normalizeJid(jid) {
  if (!jid) return "";
  return String(jid).replace(/:.*@/, "@");
}

function getUserJid(msg) {
  return normalizeJid(msg.key.participant || msg.key.remoteJid || "");
}

function getUid(userJid) {
  if (!chatHistory.has(userJid)) {
    chatHistory.set(userJid, `akira_${userJid}_${Date.now()}`);
  }
  return chatHistory.get(userJid);
}

function shortReplyHint(forceShort) {
  return forceShort
    ? "\n\nKeep this reply to one natural sentence only."
    : "";
}

function chooseReactionImage(userText, reply) {
  const text = `${userText} ${reply}`.toLowerCase();
  if (/\b(lol|lmao|haha|funny|笑)\b/.test(text)) return "laughing_happy.jpg";
  if (/\b(sad|cry|sorry|hurt|rough day)\b/.test(text)) return "crying_flustered.jpg";
  if (/\b(nani|what|seriously|really|bruh|huh)\b/.test(text)) return "blank_stare.jpg";
  if (/\b(cute|pretty|handsome|compliment)\b/.test(text)) return "smug_chest.jpg";
  return "tea_deadpan.jpg";
}

async function sendReactionSticker(sock, jid, msg, userText, reply) {
  try {
    const imagePath = path.resolve(
      "media",
      "akira",
      chooseReactionImage(userText, reply)
    );
    const imageBuffer = await readFile(imagePath);
    const stickerBuffer = await new Sticker(imageBuffer, {
      pack: "Akira Reactions",
      author: settings.botName || "AKIRA MD",
      type: StickerTypes.FULL,
      quality: 80,
    }).toBuffer();

    await sock.sendMessage(
      jid,
      { sticker: stickerBuffer },
      { quoted: msg }
    );
  } catch (error) {
    // A reaction sticker is optional; never turn a successful AI reply into
    // an error message just because image conversion or delivery failed.
    console.error("[akira] reaction sticker failed:", error.message);
  }
}

async function runForUser(userJid, task) {
  const previous = userQueues.get(userJid) || Promise.resolve();
  const next = previous.catch(() => {}).then(task);
  userQueues.set(userJid, next);
  try {
    return await next;
  } finally {
    if (userQueues.get(userJid) === next) userQueues.delete(userJid);
  }
}

/** Fully reset a user's Kimi session and durable Akira memory. */
export async function resetAkiraSession(userJid) {
  const normalizedJid = normalizeJid(userJid);
  const uid = chatHistory.get(normalizedJid);
  if (uid) resetKimiSession(uid);
  chatHistory.delete(normalizedJid);
  await resetAkiraMemory(normalizedJid);
}

/**
 * Call OmegaTech Kimi as Akira and send the reply.
 *
 * @param {object} sock      – Baileys socket
 * @param {object} msg       – raw WhatsApp message
 * @param {string} userText  – cleaned text to send
 */
export async function callAkira(sock, msg, userText) {
  const jid = msg.key.remoteJid;
  const userJid = getUserJid(msg);
  if (!jid || !userJid || !userText?.trim()) return;

  return runForUser(userJid, async () => {
    const displayName = msg.pushName || "";
    const explicitName = extractExplicitName(userText);
    const memory = await getAkiraMemory(userJid, displayName);
    const uid = getUid(userJid);
    const forceShort = Math.random() < 0.18;
    const prompt = `${userText.trim()}${shortReplyHint(forceShort)}`;

    await sock.sendPresenceUpdate("composing", jid);

    try {
      const reply = await askKimi(prompt, {
        systemPrompt: `${AKIRA_SYSTEM}${formatAkiraMemory({
          ...memory,
          name: explicitName || memory.name || displayName || null,
        })}`,
        uid,
      });

      await sock.sendPresenceUpdate("paused", jid);

      const isGroup = jid.endsWith("@g.us");
      const sender = msg.key.participant || msg.key.remoteJid || "";
      const mentionList = isGroup && sender ? [sender] : [];

      await sock.sendMessage(
        jid,
        { text: reply, mentions: mentionList },
        { quoted: msg }
      );

      await recordAkiraTurn(userJid, {
        chatJid: jid,
        displayName,
        explicitName,
        userText,
        assistantText: reply,
      });

      // Akira can occasionally react with one of the bundled character images,
      // matching the reference's visual rhythm without spamming the chat.
      if (Math.random() < 0.12) {
        await sendReactionSticker(sock, jid, msg, userText, reply);
      }
    } catch {
      await sock.sendPresenceUpdate("paused", jid);
      await sock.sendMessage(jid, {
        text:
          `*Akira:* *clutches chest*\n\n` +
          `A-ahh... something went wrong! I couldn't respond properly...\n\n` +
          `Try again in a second, senpai~`,
      }, { quoted: msg });
    }
  });
}