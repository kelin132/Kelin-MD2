/**
 * KELIN MD — .gojo character chat
 * Browse and chat with character bots from Omegatech's Meta endpoint.
 *
 * Examples:
 *   .gojo
 *   .gojo category Anime
 *   .gojo use 1
 *   .gojo What do you think about Sukuna?
 *   .gojo reset
 */

const META_ENDPOINT = "https://omegatech-api.dixonomega.tech/api/ai/Meta";
const CATALOG_CACHE_MS = 10 * 60 * 1000;
const MAX_PROMPT_LENGTH = 1_000;

const sessions = new Map();
let catalogCache = { expiresAt: 0, categories: [] };

function sessionKey(jid, sender) {
  return `${jid}:${sender || jid}`;
}

function getSession(jid, sender) {
  const key = sessionKey(jid, sender);
  if (!sessions.has(key)) sessions.set(key, {});
  return sessions.get(key);
}

async function fetchCatalog() {
  if (catalogCache.expiresAt > Date.now() && catalogCache.categories.length) {
    return catalogCache.categories;
  }

  const params = new URLSearchParams({
    action: "categories",
    prompt: "characters",
  });
  const response = await fetch(`${META_ENDPOINT}?${params.toString()}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`The character service returned an invalid response (${response.status}).`);
  }

  if (!response.ok || payload?.success !== true || !Array.isArray(payload?.data)) {
    throw new Error(
      payload?.error ||
        payload?.message ||
        `The character service returned status ${response.status}.`,
    );
  }

  catalogCache = {
    categories: payload.data.filter((category) => Array.isArray(category?.bots)),
    expiresAt: Date.now() + CATALOG_CACHE_MS,
  };
  return catalogCache.categories;
}

async function chatWithBot(botId, prompt, sessionId) {
  const params = new URLSearchParams({
    action: "chat",
    botId: String(botId),
    prompt,
  });
  if (sessionId) params.set("sessionId", sessionId);

  const response = await fetch(`${META_ENDPOINT}?${params.toString()}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(90_000),
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`The character service returned an invalid response (${response.status}).`);
  }

  const reply = payload?.data?.reply;
  if (!response.ok || payload?.success !== true || !reply) {
    throw new Error(
      payload?.error ||
        payload?.message ||
        `The character service returned status ${response.status}.`,
    );
  }

  return {
    reply: String(reply),
    sessionId: payload.data.sessionId || sessionId || null,
  };
}

function findCategory(categories, value) {
  const normalized = String(value || "").trim().toLowerCase();
  return categories.find(
    (category) =>
      String(category.cname || "").toLowerCase() === normalized ||
      String(category.id || "") === normalized,
  );
}

function categoryMenu(categories, selectedBot) {
  const lines = [
    "🎭 *Character Chat*",
    "",
    selectedBot ? `Current character: *${selectedBot.bot_name}*` : "No character selected.",
    "",
    "*Categories:*",
  ];

  for (const category of categories) {
    lines.push(`• *${category.cname}* — ${category.bots.length} characters`);
  }

  lines.push(
    "",
    "Browse a category:",
    "`.gojo category Anime`",
    "",
    "Choose a character by number:",
    "`.gojo use 1`",
  );
  return lines.join("\n");
}

function botMenu(category, selectedBot) {
  const lines = [
    `🎭 *${category.cname} Characters*`,
    "",
    ...category.bots.map(
      (bot, index) =>
        `${index + 1}. *${bot.bot_name}*${bot.description ? ` — ${bot.description.split(/[.!?]/)[0]}` : ""}`,
    ),
    "",
    "Choose one:",
    "`.gojo use <number>`",
  ];

  if (selectedBot) {
    lines.push(`\nCurrent character: *${selectedBot.bot_name}*`);
  }
  return lines.join("\n");
}

function findBot(categories, state, value) {
  const input = String(value || "").trim();
  if (!input) return null;

  const number = Number(input);
  if (Number.isInteger(number) && number > 0 && state.categoryBots?.[number - 1]) {
    return state.categoryBots[number - 1];
  }

  const normalized = input.toLowerCase();
  return categories
    .flatMap((category) => category.bots)
    .find((bot) => String(bot.bot_name || "").toLowerCase() === normalized) || null;
}

export default {
  name: "gojo",
  description: "Chat with selectable AI character bots",
  category: "ai",
  usage: ".gojo [category <name> | use <number> | message | reset]",
  aliases: ["characters", "metaai"],
  cooldown: 5,
  isPremium: true,

  async run({ sock, msg, text, args, sender }) {
    const jid = msg.key.remoteJid;
    const state = getSession(jid, sender);
    const action = String(args[0] || "").toLowerCase();

    try {
      const categories = await fetchCatalog();
      const selectedBot = state.bot;

      if (!text || action === "list" || action === "help") {
        return sock.sendMessage(jid, { text: categoryMenu(categories, selectedBot) }, { quoted: msg });
      }

      if (action === "category" || action === "categories") {
        const category = findCategory(categories, args.slice(1).join(" "));
        if (!category) {
          return sock.sendMessage(
            jid,
            {
              text: `❌ Category not found.\n\n${categoryMenu(categories, selectedBot)}`,
            },
            { quoted: msg },
          );
        }

        state.category = category.cname;
        state.categoryBots = category.bots;
        return sock.sendMessage(jid, { text: botMenu(category, selectedBot) }, { quoted: msg });
      }

      if (action === "use" || action === "select" || action === "choose") {
        const bot = findBot(categories, state, args.slice(1).join(" "));
        if (!bot) {
          return sock.sendMessage(
            jid,
            {
              text:
                "❌ Character not found.\n\n" +
                "First browse a category, then use `.gojo use <number>`.",
            },
            { quoted: msg },
          );
        }

        state.bot = bot;
        state.sessionId = null;
        state.category = categories.find((category) =>
          category.bots.some((candidate) => candidate.bot_id === bot.bot_id),
        )?.cname;
        state.categoryBots =
          categories.find((category) => category.cname === state.category)?.bots || state.categoryBots;

        return sock.sendMessage(
          jid,
          {
            text:
              `✅ Now chatting with *${bot.bot_name}*.\n\n` +
              `${bot.prologue || bot.description || "Send a message to begin."}\n\n` +
              `Send a message with *.gojo <message>* or use *.gojo reset* to start over.`,
          },
          { quoted: msg },
        );
      }

      if (action === "reset" || action === "clear") {
        if (!state.bot) {
          return sock.sendMessage(
            jid,
            { text: "❌ Select a character first with *.gojo category Anime*." },
            { quoted: msg },
          );
        }
        state.sessionId = null;
        return sock.sendMessage(
          jid,
          { text: `🔄 *${state.bot.bot_name}* conversation reset. Send a new message.` },
          { quoted: msg },
        );
      }

      if (!state.bot) {
        return sock.sendMessage(
          jid,
          {
            text:
              "❌ Select a character first.\n\n" +
              "Example:\n*.gojo category Anime*\n*.gojo use 1*",
          },
          { quoted: msg },
        );
      }

      const prompt = text.trim();
      if (prompt.length > MAX_PROMPT_LENGTH) {
        return sock.sendMessage(
          jid,
          { text: `❌ Keep your message under ${MAX_PROMPT_LENGTH} characters.` },
          { quoted: msg },
        );
      }

      await sock.sendPresenceUpdate("composing", jid);
      const result = await chatWithBot(state.bot.bot_id, prompt, state.sessionId);
      state.sessionId = result.sessionId;
      await sock.sendMessage(
        jid,
        {
          text: `*${state.bot.bot_name}:*\n\n${result.reply}`,
        },
        { quoted: msg },
      );
    } catch (err) {
      console.error("[gojo]", err);
      await sock.sendMessage(
        jid,
        {
          text:
            "❌ Character chat is temporarily unavailable.\n\n" +
            `_${err instanceof Error ? err.message : "Please try again later."}_`,
        },
        { quoted: msg },
      );
    } finally {
      await sock.sendPresenceUpdate("paused", jid);
    }
  },
};