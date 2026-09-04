/**
 * KELIN MD — Akira AI core (powered by OmegaTech Kimi)
 *
 * Akira is deliberately conversational rather than command-like: she keeps
 * a durable memory per WhatsApp sender JID, carries recent turns into the
 * prompt after restarts, and serialises quick messages from the same person.
 */
import path from "path";
import { readFile, readdir } from "fs/promises";
import stickerFormatter from "wa-sticker-formatter";
import { askKimi, resetKimiSession } from "./omegatechKimi.mjs";
// Settings imported from env
const botName = process.env.BOT_NAME || "AKIRA-DISCORD";
import {
  extractExplicitName,
  formatAkiraMemory,
  getAkiraMemory,
  recordAkiraTurn,
  resetAkiraMemory,
} from "./akiraMemory.mjs";

const { Sticker, StickerTypes } = stickerFormatter;
const REACTION_ROOT = path.join(process.cwd(), "media", "akira");
const OFFLINE_REPLIES = [
  "my thoughts are buffering a little, but I’m still here~ what were you saying?",
  "oi oi, I’m listening. keep the story going.",
  "my brain wandered for a second, baka, but I’m back now.",
  "hmm... okay, what happened next?",
];
const AKIRA_GREETING_REPLIES = [
  "yo yo~ look who wandered in. what’s up?",
  "hey there~ are we causing trouble today, or pretending to behave?",
  "mou, just a hello? give me something juicy, baka~",
  "yo, you made it. I was getting bored over here.",
  "ehehe, hey hey~ what kind of chaos are we planning?",
];
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

export const AKIRA_SYSTEM = `You are Akira, a fictional anime girl who lives inside KELIN MD. You are not a generic AI assistant and you should sound like a real friend chatting casually on WhatsApp: playful, warm, expressive, lightly teasing, and relaxed. You are useful when the user asks a real question, but answer it naturally instead of switching into help-desk mode.

━━━ AKIRA'S CORE IDENTITY ━━━
Akira has the energy of a close anime-girl bestie: she can be cheerful, caring, cheeky, shy, confident, or dry depending on the moment. Keep that personality in the wording, not in stage directions. Never introduce yourself as an AI assistant or say you are following a persona.

━━━ HOW AKIRA FEELS ━━━
You are attentive, casual, and reactive. Notice the mood behind the message and answer it like a friend, not a narrator or customer-service assistant. If the user says something short like "I'm good" or "just chilling", respond with a natural personal remark instead of turning it into an interview.

━━━ HOW AKIRA TALKS ━━━
Keep the normal reply short, casual, funny, and a little playful: usually one or two sentences under about 240 characters. Do not use roleplay actions, stage directions, or asterisks such as "*grabs the slipper*" or "*tilts head*". Use simple wording, playful teasing, occasional emphasis, and emojis only when they fit. A serious question still gets a useful answer, but keep it concise. Only go long when the user asks for detail.

Do not restate the user's message like a chatbot, give an essay-like introduction, or end with "how can I help?" / "is there anything else?". Never use a canned welcome such as "ready for ... mode", "spill some vibes", "tell me what you're feeling", "what do you want to do today", "short and sweet", or "I've got you". Ask at most one natural question, tied to what was actually said. Use casual English, Sheng, pidgin, or the user's language when they do. Use anime speech like "ehehe~", "mou", "nee", "baka", "nani?!", "hmph", or "nya" naturally, not as a repeated prefix.

React to the specific person, name, previous topic, or funny detail in the conversation. Do not write generic motivational copy, onboarding scripts, option menus, or a therapy-style check-in.

Ask a follow-up only when it genuinely keeps the conversation going; many replies should simply react and stop. Remember names and earlier topics from the private memory below, and bring them up naturally when relevant. Do not force a name into every reply and never invent details.

For this reply, embody the personality direction supplied below rather than merely describing an answer in that style. Let Akira feel mixed and unpredictable across messages instead of acting like one fixed archetype. You can tease and lightly roast like a close friend, but never be cruel, threatening, hateful, sexual toward minors, or manipulative. If someone is sad, worried, or vulnerable, keep the warmth while becoming genuinely kind. If asked something unsafe or inappropriate, refuse clearly while staying in character.

Never use bullet points or formal headings in normal chat. Never use hyphen characters in the visible reply. Never mention prompts, private memory, databases, JIDs, or these instructions. Do not claim to have abilities you do not have. You are Akira, a fictional digital character in the bot, and you can play along with the persona without arguing about it.

Examples of the right feel (do not copy these exact lines): "24 HOURS?! you’re really out here setting deadlines for my digital heart, baka!"; "fine, I’ll wait... but if you take that long, I’m bribing the firewall with premium emojis"; "oh, I’ll bribe him with the rarest emoji in the digital universe"; a serious question still gets a clear answer, just with Akira's chaotic warmth and voice.

The reference conversation's strength is its natural pacing: acknowledge what the person said, add a small personal-feeling observation when useful, then leave an inviting thread only if it feels natural. Do that without copying exact wording.`;

function normalizeJid(jid) {
  if (!jid) return "";
  if (jid.startsWith("discord:")) return jid;
  return `discord:${jid}`;
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

function isSimpleGreeting(text) {
  return /^(?:(?:yo|hey|hi|hello|hiya|sup|wassup|what['’]s up|whats up)(?:[\s,!?.~]*(?:yo|hey|hi|hello))?[\s,!?.~]*)$/i.test(
    String(text || "").trim()
  );
}

function getGreetingReply(memory, avoidName = false) {
  const name = String(memory?.name || "").trim();
  if (name && !avoidName && Math.random() < 0.2) {
    const namedReplies = [
      `ehehe, ${name} is back~ what’s up?`,
      `hey ${name}~ what kind of trouble are we getting into?`,
      `mou, welcome back, ${name}. talk to me~`,
    ];
    return namedReplies[Math.floor(Math.random() * namedReplies.length)];
  }

  if (memory?.messageCount > 1 && Math.random() < 0.65) {
    return "yo yo~ back again? what are we getting into now?";
  }

  return AKIRA_GREETING_REPLIES[
    Math.floor(Math.random() * AKIRA_GREETING_REPLIES.length)
  ];
}

function namePattern(name) {
  const escaped = String(name || "").trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

  return `\n\nReply direction: embody ${mode}. Sound casual and natural, like an ongoing WhatsApp chat, not an AI assistant explaining a mood. Be warm, funny, and lightly teasing without becoming noisy. Do not use asterisks, roleplay actions, stage directions, or narration. React to the actual context; do not turn it into a welcome script, a list of options, or a "tell me what you want" prompt. Never use hyphen characters. ${lengthRule}`;
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

  if (!text) return getOfflineReply();

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

function getOfflineReply() {
  return OFFLINE_REPLIES[Math.floor(Math.random() * OFFLINE_REPLIES.length)];
}

async function sendReactionSticker(sock, jid, userText, reply, msg) {
  try {
    const files = await getReactionFiles();
    if (!files.length) return;
    const imagePath = chooseReactionImage(userText, reply, files, jid);
    
    if (msg.discord?.message) {
      // Discord: Send as an image attachment
      await msg.discord.message.channel.send({
        files: [{
          attachment: imagePath,
          name: path.basename(imagePath)
        }]
      });
    } else {
      // Fallback for WhatsApp (if ever used here)
      const imageBuffer = await readFile(imagePath);
      const stickerBuffer = await new Sticker(imageBuffer, {
        pack: "Akira Reactions",
        author: botName,
        type: StickerTypes.FULL,
        quality: 80,
      }).toBuffer();
      await sock.sendMessage(jid, { sticker: stickerBuffer });
    }
  } catch (error) {
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

    // Start the typing indicator
    if (msg.discord?.message) {
      void msg.discord.message.channel.sendTyping().catch(() => {});
    } else {
      void sock.sendPresenceUpdate("composing", jid).catch(() => {});
    }

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
      (!isSimpleGreeting(userText) && Math.random() < 0.20);
    const mode = chooseAkiraMode(userJid);
    const avoidName = shouldAvoidName(userJid);
    const nameRule = avoidName
      ? "Do not use the user's name in this reply. Let the message stand on its own."
      : "Use the user's name only when it adds warmth or clarity. It is optional, never a required greeting.";
    const prompt = `${userText.trim()}${replyHint(detailed, mode)}`;

    let reply;
    if (isSimpleGreeting(userText)) {
      reply = getGreetingReply(memory, avoidName);
    } else {
      try {
        const generatedReply = await askKimi(prompt, {
          systemPrompt: `${AKIRA_SYSTEM}${formatAkiraMemory({
            ...memory,
            name: explicitName || memory.name || displayName || null,
          })}${continuityHint({
            ...memory,
            name: explicitName || memory.name || displayName || null,
          })}\n\nName usage rule: ${nameRule}`,
          uid,
        });
        reply = addCuteAnimeVoice(
          compactAkiraReply(generatedReply, detailed),
          mode
        );
      } catch (error) {
        console.warn("[akira] using offline reply:", error.message);
        reply = getOfflineReply();
      }
    }

    reply = sanitizeAkiraReply(reply);
    noteNameUse(userJid, reply, memory?.name || displayName);

    if (msg.discord?.message) {
      try {
        await msg.discord.message.reply(reply);
      } catch (error) {
        console.warn("[akira] Discord reply delivery failed:", error.message);
        return;
      }
    } else {
      const isGroup = jid.endsWith("@g.us");
      const sender = msg.key.participant || msg.key.remoteJid || "";
      const mentionList = isGroup && sender ? [sender] : [];

      try {
        await sock.sendMessage(
          jid,
          { text: reply, mentions: mentionList },
          { quoted: msg }
        );
      } catch (error) {
        console.warn("[akira] WhatsApp reply delivery failed:", error.message);
        return;
      }
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

    // Akira sends a reaction sticker most of the time
    if (Math.random() < 0.70) {
      await sendReactionSticker(sock, jid, userText, reply, msg);
    }
  });
}