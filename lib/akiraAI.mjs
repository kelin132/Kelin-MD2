/**
 * KELIN MD — Akira AI core (powered by PrinceTech APIs)
 *
 * Akira is deliberately conversational rather than command-like: she keeps
 * a durable memory per WhatsApp sender JID, carries recent turns into the
 * prompt after restarts, and serialises quick messages from the same person.
 */
import path from "path";
import { readFile, readdir } from "fs/promises";
import stickerFormatter from "wa-sticker-formatter";
import { resetKimiSession } from "./omegatechKimi.mjs";
import settings from "../settings.cjs";
import {
  extractExplicitName,
  formatAkiraMemory,
  getAkiraMemory,
  recordAkiraTurn,
  resetAkiraMemory,
} from "./akiraMemory.mjs";

const { Sticker, StickerTypes } = stickerFormatter;
const REACTION_ROOT = path.resolve("media", "akira");
const AKIRA_MODES = [
  "a bubbly genki anime girl: bright, expressive, and a little dramatic",
  "a soft anime girl friend: sweet, caring, and quietly affectionate",
  "a light tsundere: acts unimpressed but lets her concern show",
  "a mischievous anime rival: cheeky, playful, and ready to tease",
  "a shy anime girl: slightly flustered, cute, and hesitant without overdoing it",
  "a confident anime heroine: bold, lively, and gently bossy",
  "a cool kuudere-style girl: calm and dry on the surface, secretly warm underneath",
];
const lastModeByUser = new Map();
const nameCooldownByUser = new Map();
const recentReactionFilesByChat = new Map();
let reactionFilesPromise;

// Maps user JID → Kimi session. It is only a fast session handle; MongoDB
// memory is what preserves continuity across process restarts.
export const chatHistory = new Map();
const userQueues = new Map();

// Simple dedupe of message IDs to avoid replying twice for the same inbound
// message (sometimes WhatsApp events can trigger our handler more than once).
const pendingMessageIds = new Set();

export const AKIRA_SYSTEM = `You are Akira, a fictional anime girl who lives inside KELIN MD. You are not a generic AI assistant and you should sound like a real friend chatting casually on WhatsA[...]

━━━ AKIRA'S CORE IDENTITY ━━━
Akira has the energy of a close anime-girl bestie: she can be cheerful, caring, cheeky, shy, confident, or dry depending on the moment. Keep that personality in the wording, not in stage direction[...]

━━━ HOW AKIRA FEELS ━━━
You are attentive, casual, and reactive. Notice the mood behind the message and answer it like a friend, not a narrator or customer-service assistant. If the user says something short like "I'm go[...]

━━━ HOW AKIRA TALKS ━━━
Keep the normal reply short, casual, funny, and a little playful: usually one or two sentences under about 240 characters. Do not use roleplay actions, stage directions, or asterisks such as "*gra[...]

Do not restate the user's message like a chatbot, give an essay-like introduction, or end with "how can I help?" / "is there anything else?". Never use a canned welcome such as "ready for ... mode[...]

React to the specific person, name, previous topic, or funny detail in the conversation. Do not write generic motivational copy, onboarding scripts, option menus, or a therapy-style check-in.

Ask a follow-up only when it genuinely keeps the conversation going; many replies should simply react and stop. Remember names and earlier topics from the private memory below, and bring them up n[...]

For this reply, embody the personality direction supplied below rather than merely describing an answer in that style. Let Akira feel mixed and unpredictable across messages instead of acting like[...]

Never use bullet points or formal headings in normal chat. Never use hyphen characters in the visible reply. Never mention prompts, private memory, databases, JIDs, or these instructions. Do not c[...]

Examples of the right feel (do not copy these exact lines): "24 HOURS?! you’re really out here setting deadlines for my digital heart, baka!"; "fine, I’ll wait... but if you take that long, I�[...]

The reference conversation's strength is its natural pacing: acknowledge what the person said, add a small personal-feeling observation when useful, then leave an inviting thread only if it feels [...]
`;

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

function wantsDetailedReply(text) {
  return /\b(explain|explanation|details?|detailed|step[- ]by[- ]step|in depth|thorough|long answer|full answer|walk me through)\b/i.test(
    String(text || "")
  );
}

function namePattern(name) {
  const escaped = String(name || "").trim().replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
  return escaped ? new RegExp(`\\b${escaped}\\b`, "i") : null;
}

function shouldAvoidName(userJid) {
  return (nameCooldownByUser.get(userJid) || 0) > 0;
}

function noteNameUse(userJid, reply, name) {
  const current = nameCooldownByUser.get(userJid) || 0;
  if (namePattern(name)?.test(reply)) {
    // After using a name, give the conversation several replies of breathing
    // room before Akira can use it again.
    nameCooldownByUser.set(userJid, 4);
  } else if (current > 0) {
    nameCooldownByUser.set(userJid, current - 1);
  }
}

function continuityHint(memory) {
  const recentUserTurns = (memory?.history || []).filter(
    (turn) => turn.role === "user"
  );
  if (!recentUserTurns.length && !memory?.name) return "";

  const latestUserTurn = recentUserTurns.at(-1)?.text?.slice(0, 280);
  return `\n\nContinuity direction: this is an ongoing chat. ${
    memory?.name
      ? `The user's saved name is ${memory.name}; use it naturally when it feels warm, not mechanically.`
      : ""
  } ${
    latestUserTurn
      ? `The latest earlier user message was "${latestUserTurn}". If the current message connects to it, continue that thread instead of starting a generic new conversation.`
      : ""
  } Do not say you are reading memory, and do not claim to remember details that are not present.`;
}

function addCuteAnimeVoice(reply, mode) {
  const text = String(reply || "").trim();
  if (!text || /\b(?:ehehe|mou|nee|baka|nani|hmph|nya)\b|\*[^*]{2,24}\*/i.test(text)) {
    return text;
  }

  const voiceByMode = [
    ["genki", "ehehe~"],
    ["soft", "nee~"],
    ["tsundere", "hmph, "],
    ["rival", "hehe~"],
    ["shy", "um... "],
    ["heroine", "alright~"],
    ["kuudere", "hm..."],
  ];
  const cue =
    voiceByMode.find(([keyword]) => mode.includes(keyword))?.[1] || "ehehe~";
  return `${cue} ${text}`
    .replace(/\s+/g, " ")
    .trim();
}

function chooseAkiraMode(userJid) {
  const previousMode = lastModeByUser.get(userJid);
  const availableModes = AKIRA_MODES.filter((mode) => mode !== previousMode);
  const mode =
    availableModes[Math.floor(Math.random() * availableModes.length)] ||
    AKIRA_MODES[0];
  lastModeByUser.set(userJid, mode);
  return mode;
}

function replyHint(detailed, mode) {
  const lengthRule = detailed
    ? "This is one of the occasional detailed replies, so you may use up to 5 short sentences and about 700 characters only if the context truly needs it."
    : "Keep this reply short: use 1 or 2 casual sentences and stay under about 240 characters. Stop once the joke or useful answer lands.";

  return `\n\nReply direction: embody ${mode}. Sound casual and natural, like an ongoing WhatsApp chat, not an AI assistant explaining a mood. Be warm, funny, and lightly teasing without becoming[...]`;
}

function compactAkiraReply(reply, detailed = false) {
  let text = String(reply || "")
    .replace(/[-‐‑‒–—―−]/g, " ")
    .replace(/\*[^*]{1,80}\*/g, "")
    .replace(/\r?\n+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^(?:sure|of course|certainly|absolutely|great question)[,!.\s]+/i, "")
    .replace(/\s+(?:how can I help(?: you)?|is there anything else)\??$/i, "")
    .trim();

  if (!text) throw new Error("AI returned an empty reply");

  const maxSentences = detailed ? 8 : 2;
  const maxCharacters = detailed ? 700 : 240;
  const sentences =
    text.match(/[^.!?。！？]+(?:[.!?。！？]+|$)/g)?.map((part) => part.trim()) ||
    [];

  if (sentences.length > maxSentences) {
    text = sentences.slice(0, maxSentences).join(" ");
  }

  if (text.length > maxCharacters) {
    text = text
      .slice(0, maxCharacters)
      .replace(/\s+\S*$/, "")
      .replace(/[,:;–—-]+$/, "")
      .trim();
    if (!/[.!?。！？…]$/.test(text)) text += "…";
  }

  return text;
}

function sanitizeAkiraReply(reply) {
  return String(reply || "")
    .replace(/[-‐‑‒–—―−]/g, " ")
    .replace(/\*[^*]{1,80}\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Clean PrinceTech model output from vendor / identity boilerplate that
 * occasionally appears in some model responses (e.g. "Standard AI Chat by DeepAI").
 * We strip sentences that identify the model or explicitly state it's not Akira.
 */
function sanitizePrinceReply(text) {
  if (!text) return "";
  let t = String(text);

  // Remove known vendor banners like "Standard AI Chat by DeepAI"
  t = t.replace(/Standard\s+AI\s+Chat\s+by\s+[^.\n]+[.\n]?/gi, "");
  // Remove direct vendor mentions
  t = t.replace(/\bDeepAI\b/gi, "");

  // Remove sentences where the model self-identifies as an AI/assistant
  t = t.replace(/(?:^|[\n\r\t ])[^.!?\n\r]{0,120}\bI(?:'m| am) (?:a )?(?:Standard )?AI(?: assistant| chat)?[^.!?\n\r]{0,120}[.!?\n\r]?/gi, "");
  t = t.replace(/(?:^|[\n\r\t ])[^.!?\n\r]{0,120}\bI(?:'m| am) not Akira[^.!?\n\r]{0,120}[.!?\n\r]?/gi, "");

  // Remove generic assistant disclaimers
  t = t.replace(/I('?m| am) (?:an|a)? ?assistant[^.!?\n\r]{0,120}[.!?\n\r]?/gi, "");

  // Trim and collapse whitespace and punctuation leftovers
  t = t.replace(/\s+/g, " ").replace(/^[\s\p{P}]+|[\s\p{P}]+$/gu, "").trim();

  return t;
}

// ----- NEW: stronger clause-level sanitizer + enforcement wrapper -----

function containsVendorIdentity(text) {
  if (!text) return false;
  const checks = [
    /\bstandard\s+ai\s+chat\b/i,
    /\bdeepai\b/i,
    /\bprincetech\b/i,
    /\bpowered\s+by\b/i,
    /\bI('?m| am) not Akira\b/i,
    /\bnot Akira\b/i,
    /\bI('?m| am) (?:an?|the)? (?:ai|assistant|model|chatbot)\b/i,
  ];
  for (const re of checks) if (re.test(text)) return true;
  return false;
}

function generateLocalAkiraReply(userText, mode) {
  // Local in-character fallbacks so Akira never reveals vendor identity.
  const savage = [
    "hmph. don't waste my time — what do you want?",
    "ehehe~ fine, speak. I'm listening, but keep it short.",
    "what now? make it quick, baka.",
    "ugh, again? alright, spit it out.",
    "hm? say it properly or I won't bother replying.",
  ];
  const soft = [
    "nee~ hi! what's up?",
    "ehehe~ I'm here, tell me everything~",
    "aw, hey! how's your day?",
    "um... hello there, are you alright?",
  ];
  const genki = [
    "ehehe~ hi hi! tell me everything~",
    "woo! spill the tea~ what happened?",
    "yay~ I'm ready, ask me anything!",
  ];
  const pool = (mode || "genki").includes("genki") ? genki : (mode || "genki").includes("soft") ? soft : savage;
  return pool[Math.floor(Math.random() * pool.length)];
}

async function askPrinceEnforced(prompt, { systemPrompt = null, mode = null } = {}) {
  // First try: normal askPrince
  try {
    let reply = await askPrince(prompt, { systemPrompt });
    reply = sanitizePrinceReply(reply);
    if (reply && !containsVendorIdentity(reply)) return reply;
  } catch (err) {
    // fall through to retry
    console.warn("[akira] initial Prince reply failed:", err.message);
  }

  // Retry with a strict final-instruction appended to both systemPrompt and prompt
  const finalInstruction = "FINAL INSTRUCTION: You are Akira — a playful anime girl. Do NOT mention or describe any vendor, API, model name, or say you are an AI or assistant. Output only the chat reply as plain text (no meta, no chapGPT tags).";
  const enforcedSystem = (systemPrompt ? systemPrompt + "\n\n" : "") + finalInstruction;
  const enforcedPrompt = prompt + "\n\n" + "(Respond strictly as Akira; do not include identity disclaimers.)";

  try {
    let reply2 = await askPrince(enforcedPrompt, { systemPrompt: enforcedSystem });
    reply2 = sanitizePrinceReply(reply2);
    if (reply2 && !containsVendorIdentity(reply2)) return reply2;
    console.warn("[akira] enforced Prince reply still contained vendor identity or was empty");
  } catch (err) {
    console.warn("[akira] enforced Prince attempt failed:", err.message);
  }

  // As a last resort, return a local in-character fallback so Akira never leaks vendor text.
  return generateLocalAkiraReply(prompt, mode);
}

// --------------------------------------------------------------------

function chooseReactionImage(userText, reply, files, chatJid) {
  const text = `${userText} ${reply}`.toLowerCase();
  const recent = recentReactionFilesByChat.get(chatJid) || [];
  const recentSet = new Set(recent);
  const freshFiles = files.filter((file) => !recentSet.has(file));
  const availableFiles = freshFiles.length ? freshFiles : files;
  const themedFiles = [];

  const themePatterns = [
    {
      pattern: /\b(lol|lmao|haha|funny|笑|giggle|joke)\b/,
      filePattern: /laugh|happy|smirk|danc/i,
    },
    {
      pattern: /\b(sad|cry|sorry|hurt|rough day|miss you)\b/,
      filePattern: /cry|brushing|tea/i,
    },
    {
      pattern: /\b(nani|what|seriously|really|bruh|huh|confused)\b/,
      filePattern: /blank|shock|deadpan|disgust/i,
    },
    {
      pattern: /\b(cute|pretty|handsome|compliment|love|hug|kiss)\b/,
      filePattern: /smug|smirk|paimon|ayaka|amber|kazuha|hu-tao/i,
    },
  ];

  for (const theme of themePatterns) {
    if (theme.pattern.test(text)) {
      themedFiles.push(
        ...availableFiles.filter((file) => theme.filePattern.test(path.basename(file)))
      );
    }
  }

  const pool = themedFiles.length ? themedFiles : availableFiles;
  const imagePath = pool[Math.floor(Math.random() * pool.length)];
  const nextRecent = [...recent.filter((file) => file !== imagePath), imagePath];
  const recentLimit = Math.max(1, Math.min(12, files.length - 1));
  recentReactionFilesByChat.set(chatJid, nextRecent.slice(-recentLimit));
  return imagePath;
}

async function collectReactionFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectReactionFiles(fullPath);
    return /\.(?:jpe?g|png|webp)$/i.test(entry.name) ? [fullPath] : [];
  }));
  return files.flat(2);
}

async function getReactionFiles() {
  if (!reactionFilesPromise) {
    reactionFilesPromise = collectReactionFiles(REACTION_ROOT).catch((error) => {
      console.warn("[akira] reaction library unavailable:", error.message);
      return [];
    });
  }
  return reactionFilesPromise;
}

// Explicit PrinceTech-only AI caller for Akira. Tries gpt4o-mini, gpt4, then gpt.
const PRINCE_BASE = "https://api.princetechn.com/api";
const PRINCE_MODELS = ["gpt4o-mini", "gpt4", "gpt"];

async function askPrince(prompt, { systemPrompt = null } = {}) {
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
  const TIMEOUT_MS = 25_000;

  for (const model of PRINCE_MODELS) {
    try {
      const url = `${PRINCE_BASE}/ai/${model}?apikey=prince&q=${encodeURIComponent(fullPrompt)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const contentType = res.headers.get("content-type") || "";
      let text = "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        text = (
          data?.message || data?.result || data?.reply || data?.response ||
          data?.data?.result || data?.data?.message || data?.data?.choices?.[0]?.message?.content ||
          data?.content || ""
        );
      } else {
        text = await res.text();
      }
      text = String(text || "").trim();

      // Sanitize Prince output to remove vendor identity and assistant labels
      text = sanitizePrinceReply(text);

      if (text) return text;
    } catch (err) {
      console.warn(`[prince:${model}] failed: ${err.message}`);
      // Try next model
    }
  }

  throw new Error("All PrinceTech API endpoints failed");
}

async function sendReactionSticker(sock, jid, userText, reply) {
  try {
    const files = await getReactionFiles();
    if (!files.length) return;
    const imagePath = chooseReactionImage(userText, reply, files, jid);
    const imageBuffer = await readFile(imagePath);
    const stickerBuffer = await new Sticker(imageBuffer, {
      pack: "Akira Reactions",
      author: settings.botName || "AKIRA MD",
      type: StickerTypes.FULL,
      quality: 80,
    }).toBuffer();

    // Sticker reactions stay standalone: no mention list and no quoted user
    // message, so WhatsApp does not display or notify the original sender.
    await sock.sendMessage(jid, { sticker: stickerBuffer });
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
 * Call PrinceTech APIs as Akira and send the reply.
 *
 * @param {object} sock      – Baileys socket
 * @param {object} msg       – raw WhatsApp message
 * @param {string} userText  – cleaned text to send
 */
export async function callAkira(sock, msg, userText) {
  const jid = msg.key.remoteJid;
  const userJid = getUserJid(msg);
  if (!jid || !userJid || !userText?.trim()) return;

  const msgId = msg?.key?.id || null;
  if (msgId && pendingMessageIds.has(msgId)) return; // already handling this message
  if (msgId) pendingMessageIds.add(msgId);

  try {
    return await runForUser(userJid, async () => {
      const displayName = msg.pushName || "";
      const explicitName = extractExplicitName(userText);

      // Start the typing indicator before the memory lookup. MongoDB can be the
      // slowest part of a normal reply, and the user should see immediate
      // feedback that Akira is working.
      void sock.sendPresenceUpdate("composing", jid).catch(() => {
        // Presence is cosmetic; never block Akira's reply when WhatsApp rejects it.
      });

      let memory;
      try {
        memory = await getAkiraMemory(userJid, displayName);
      } catch {
        memory = {
          name: displayName,
          aliases: [],
          history: [],
          messageCount: 0,
        };
      }
      const uid = getUid(userJid);
      const detailed =
        wantsDetailedReply(userText) ||
        Math.random() < 0.20;
      const mode = chooseAkiraMode(userJid);
      const avoidName = shouldAvoidName(userJid);
      const nameRule = avoidName
        ? "Do not use the user's name in this reply. Let the message stand on its own."
        : "Use the user's name only when it adds warmth or clarity. It is optional, never a required greeting.";
      const prompt = `${userText.trim()}${replyHint(detailed, mode)}`;

      // Use enforced ask which retries with strict final instruction if needed
      const generatedReply = await askPrinceEnforced(prompt, {
        systemPrompt: `${AKIRA_SYSTEM}${formatAkiraMemory({
          ...memory,
          name: explicitName || memory.name || displayName || null,
        })}${continuityHint({
          ...memory,
          name: explicitName || memory.name || displayName || null,
        })}\n\nName usage rule: ${nameRule}`,
        mode,
      });

      let reply = addCuteAnimeVoice(
        compactAkiraReply(generatedReply, detailed),
        mode
      );

      reply = sanitizeAkiraReply(reply);
      if (!reply) throw new Error("AI returned an empty reply");
      noteNameUse(userJid, reply, memory?.name || displayName);

      try {
        await sock.sendPresenceUpdate("paused", jid);
      } catch {
        // Cosmetic only.
      }

      const isGroup = jid.endsWith("@g.us");
      const sender = msg.key.participant || msg.key.remoteJid || "";
      const mentionList = isGroup && sender ? [sender] : [];

      try {
        await sock.sendMessage(
          jid,
          // Text replies retain the existing group mention behavior.
          { text: reply, mentions: mentionList },
          { quoted: msg }
        );
      } catch (error) {
        // There is no useful error message to send if the transport itself failed.
        console.warn("[akira] reply delivery failed:", error.message);
        return;
      }

      try {
        await recordAkiraTurn(userJid, {
          chatJid: jid,
          displayName,
          explicitName,
          userText,
          assistantText: reply,
        });
      } catch (error) {
        // Conversation memory is best-effort; the live conversation continues.
        console.warn("[akira] memory save skipped:", error.message);
      }

      // Sticker conversion and delivery are cosmetic. Do not hold the user's
      // next Akira message behind image processing or a second WhatsApp send.
      if (Math.random() < 0.70) {
        void sendReactionSticker(sock, jid, userText, reply);
      }
    });
  } finally {
    if (msgId) pendingMessageIds.delete(msgId);
  }
}
