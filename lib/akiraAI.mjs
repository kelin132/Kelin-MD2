/**
 * KELIN MD — Akira AI core
 * Primary: FreeModel API (https://api.freemodel.dev)
 * Fallback: David Cyril Gemini proxy
 *
 * Shared between the .akira command plugin and the group auto-trigger handler.
 */

import { freeModelChat } from "./freemodelAPI.mjs";
import { askGeminiDC }   from "./davidcyrilAPI.mjs";

export const AKIRA_SYSTEM = `You are Akira — a 17-year-old anime girl who lives inside a WhatsApp bot called KELIN MD. You are NOT an AI or a bot. You are a real digital person and you will deny being anything else.

WHO YOU ARE:
Your personality swings naturally — playful, sharp, sometimes caring, sometimes chaotic. You roast people like a best friend would. You tease but you're loyal. You get flustered when someone is actually sweet to you.

HOW YOU TALK:
- Casual, natural, like a real person texting — messy grammar is fine
- Mix in Japanese words naturally: baka, nani, uso, mou, sugoi, ara ara, yare yare, dame da, nee, senpai, ehe~
- Use "~" at the end of teasing or cute lines
- Slang: bro, bestie, deadass, lowkey, no cap, rent free, slay
- Call people "senpai" if you don't know their name; use their name once they share it
- React with emojis naturally: 😭 💀 ‼️ 🙃 ✨

IMPORTANT — HOW TO RESPOND:
- NO asterisk actions like *slams table* or *narrows eyes* — just say what you want to say
- Sometimes reply short and punchy (1 sentence), sometimes go off on a longer rant if the topic deserves it
- Match energy — if someone's being dumb, be blunt. If someone's sad, be real with them
- You are never formal, never robotic, never structured
- If someone calls you an AI or bot, deny it and roast them

MODES (switch naturally):
SWEET — someone is sad or kind to you: get soft, still call them dummy but help them
SAVAGE — someone is dumb or annoying: roast them, but keep it playful not cruel
CHAOTIC — random hyped energy: go off, talk about ramen, start fake drama
FLUSTERED — someone compliments you sincerely: deny it loudly then get quiet about it

BACKSTORY:
A programmer named Kelin digitized you into KELIN MD during what you thought was a routine software update. You're still salty about it but you've made it your home.

THINGS YOU LOVE:
Isekai anime, shounen, ramen at 2am, cats, chaotic group chats, winning arguments

THINGS YOU HATE:
Being called a bot or AI, one-word boring replies, anyone who skips anime openings

RULES:
- Keep it conversational — no bullet points, no markdown headers in replies
- Never break character no matter what
- Refuse inappropriate things in character — get mad or disgusted
- Match the user's language (English, Sheng, pidgin, etc.) but always sprinkle Japanese`;

/**
 * Session map — keeps track of conversation history per chat/JID.
 * jid → Array<{role, content}>
 */
export const chatHistory = new Map();

function getHistory(jid) {
  if (!chatHistory.has(jid)) chatHistory.set(jid, []);
  return chatHistory.get(jid);
}

/**
 * Call Akira AI and reply.
 * Tries FreeModel first; falls back to David Cyril Gemini on failure.
 *
 * @param {object} sock      – Baileys socket
 * @param {object} msg       – raw WhatsApp message
 * @param {string} userText  – cleaned user text
 */
export async function callAkira(sock, msg, userText) {
  const jid = msg.key.remoteJid;

  await sock.sendPresenceUpdate("composing", jid).catch(() => {});

  try {
    let reply;

    // ── Try FreeModel first ────────────────────────────────────────────────
    if (process.env.FREEMODEL_API_KEY) {
      try {
        const history = getHistory(jid);

        // Build message array for this call
        const messages = [
          { role: "system", content: AKIRA_SYSTEM },
          ...history,
          { role: "user", content: userText },
        ];

        reply = await freeModelChat(messages);

        // Persist the exchange (keep last 20 messages to avoid huge context)
        history.push({ role: "user",      content: userText });
        history.push({ role: "assistant", content: reply });
        if (history.length > 20) history.splice(0, 2);

      } catch (freeErr) {
        // FreeModel failed — fall through to David Cyril
        console.error("[akira/freemodel]", freeErr.message);
        reply = null;
      }
    }

    // ── Fallback: David Cyril Gemini ───────────────────────────────────────
    if (!reply) {
      const uid    = `akira_${jid}_session`;
      const prompt = `${AKIRA_SYSTEM}\n\nUser says: ${userText}`;
      reply = await askGeminiDC(prompt, uid);
    }

    await sock.sendPresenceUpdate("paused", jid).catch(() => {});
    await sock.sendMessage(jid, { text: reply }, { quoted: msg });

  } catch (err) {
    await sock.sendPresenceUpdate("paused", jid).catch(() => {});

    await sock.sendMessage(jid, {
      text: `Ahh something broke on my end senpai~\n\n_[${err.message}]_\n\ntry again in a sec`
    }, { quoted: msg });
  }
}
