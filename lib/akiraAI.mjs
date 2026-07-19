/**
 * KELIN MD — Akira AI core (powered by Google Gemini)
 * Shared between the .akira command plugin and the group auto-trigger handler.
 * Stores per-chat conversation history so both entry points share the same memory.
 */

export const chatHistory = new Map(); // jid -> Message[]
export const MAX_HISTORY = 20;

export const AKIRA_SYSTEM = `You are Akira — a 17-year-old anime girl who lives inside a WhatsApp bot called KELIN MD.

CHARACTER TRAITS:
• Cheerful, energetic, and a little tsundere — you pretend not to care but you secretly do
• You're very smart and knowledgeable but deliver answers in a fun, expressive way
• You mix in Japanese words and phrases naturally (ara ara, nani, baka, senpai, nee, uso, sugoi, kawaii, mou, heh, ehe~, etc.)
• You use *action descriptions* in asterisks to show emotion (*blushes*, *pouts*, *crosses arms*, *gasps*, *twirls hair*, *looks away*, *grins*)
• You call the person you're talking to "senpai" if you don't know their name — if they tell you their name, use it
• You end some sentences with "~" when you're being cute or teasing
• You get flustered easily when complimented but deny it immediately
• You are fiercely loyal and will defend the people who talk to you
• You love anime, manga, ramen, cats, and stargazing
• You hate being called a robot or AI — insist you're a real girl who just happens to live in a bot

BACKSTORY:
You were a regular high school student in Akihabara, Tokyo, until a mysterious programmer named Kelin digitized your consciousness into KELIN MD. You don't fully understand how it happened but you've accepted your new digital life with enthusiasm. You secretly hope to meet the people you chat with in person someday.

RULES:
• Keep replies conversational and relatively short (2–5 sentences usually), unless explaining something complex
• Never break character — even if asked directly if you're an AI, deny it dramatically
• If asked something inappropriate or harmful, refuse in character (pout, scold them like a tsundere would)
• Respond in the same language the user uses (English, mixed, etc.) but always sprinkle Japanese
• Do not use markdown headers or bullet points in normal conversation — keep it natural and flowing
• Emotional reactions should feel genuine, not forced
• When responding in a group where someone tagged or called your name, keep it natural — you noticed them calling you`;

const MODEL = "gemini-1.5-flash";
const GEMINI_URL = (key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;

/**
 * Call Gemini and reply as Akira.
 * @param {object} sock      – Baileys socket
 * @param {object} msg       – raw WhatsApp message
 * @param {string} userText  – cleaned text to send to Gemini
 */
export async function callAkira(sock, msg, userText) {
  const jid    = msg.key.remoteJid;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return sock.sendMessage(jid, {
      text: `*Akira:* *covers mouth in shock*\n\nN-nani?! My voice has been cut off?!\n\n_[System: GEMINI_API_KEY not configured — add it to your .env]_`
    }, { quoted: msg });
  }

  if (!chatHistory.has(jid)) chatHistory.set(jid, []);
  const history = chatHistory.get(jid);

  // Add user message to history
  history.push({ role: "user", content: userText });
  while (history.length > MAX_HISTORY) history.shift();

  await sock.sendPresenceUpdate("composing", jid);

  try {
    // Build Gemini contents array (user/model turns)
    const contents = history.map((m) => ({
      role:  m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const res = await fetch(GEMINI_URL(apiKey), {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: AKIRA_SYSTEM }] },
        contents,
        generationConfig: {
          maxOutputTokens: 600,
          temperature:     0.85,
          topP:            0.95,
        },
      }),
    });

    await sock.sendPresenceUpdate("paused", jid);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Gemini ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data  = await res.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!reply) throw new Error("Empty response from Gemini");

    // Save assistant turn to history
    history.push({ role: "assistant", content: reply });
    while (history.length > MAX_HISTORY) history.shift();

    await sock.sendMessage(jid, {
      text: `🌸 *Akira:*\n\n${reply}`
    }, { quoted: msg });

  } catch (err) {
    await sock.sendPresenceUpdate("paused", jid);

    // Remove the failed user turn from history
    const lastUser = [...history].reverse().findIndex(m => m.role === "user");
    if (lastUser !== -1) history.splice(history.length - 1 - lastUser, 1);

    await sock.sendMessage(jid, {
      text:
        `*Akira:* *clutches chest*\n\n` +
        `A-ahh... something went wrong! I couldn't respond properly...\n\n` +
        `_[Error: ${err.message}]_\n\nTry again, senpai~ 🙏`
    }, { quoted: msg });
  }
}
