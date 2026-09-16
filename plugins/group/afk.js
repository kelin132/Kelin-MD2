/**
 * KELIN MD — .afk command (Anime Edition)
 *
 * Sets AFK status with an anime-styled message.
 * Auto-removal happens in bot.mjs when the user sends any message.
 * The user does NOT need to type .afk again to come back — it clears automatically.
 */
import { getUser, saveUser } from "../economy/database.js";
import { getAfkUser, setAfkUser } from "../../lib/pluginManager.mjs";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

// ─────────────────────────────────────────────────────────────────────────────

export default {
  name: "afk",
  aliases: ["away"],
  category: "group",
  cooldown: 6,
  description: "Go AFK — bot will notify others when they tag you.",
  usage: ".afk [reason]",

  async run({ sock, msg, sender, text: rawText }) {
    const jid   = msg.key.remoteJid;
    
    // FIX 1: Allow custom message options (like mentions) to be passed into the reply helper
    const reply = (text, options = {}) => 
      sock.sendMessage(jid, { text, mentions: options.mentions || [] }, { quoted: msg, ...options });

    const user   = await getUser(sender);
    const reason = (rawText || "").trim() || "No reason given";
    const tag    = sender.split("@")[0].split(":")[0];
    const name   = user.name || tag;

    const existingAfk = user.afk?.active
      ? {
          reason: user.afk.message || user.afk.reason || "No reason given",
          time: user.afk.since || Date.now(),
        }
      : getAfkUser(sender);

    const since = Date.now();

    // ── Save state across DB and memory ──────────────────────────────────────
    user.afk = { active: true, message: reason, since };
    await saveUser(sender, user);

    setAfkUser(sender, {
      reason,
      time: since,
      username: name,
    });

    // ── Already AFK — update the reason ──────────────────────────────────────
    if (existingAfk) {
      return reply(
`╭───〔 💤 𝗔𝗙𝗞 𝗨𝗣𝗗𝗔𝗧𝗘𝗗 〕───╮
│
│ 🌸 *@${tag}* is still away~
│
│ 📝 𝗥𝗲𝗮𝘀𝗼𝗻: ${reason}
│ ⏰ 𝗥𝗲𝘀𝗲𝘁: \`\`${formatTime(since)}\`\`
╰━━━━━━━━━━━━━━━━━━━━━━╯`,
        { mentions: [sender] }
      );
    }

    // ── Set AFK for the first time ───────────────────────────────────────────
    return reply(
`╭───〔 🌙 𝗔𝗙𝗞 𝗠𝗢𝗗𝗘 〕───╮
│
│ 🌸 *@${tag}* has gone away~
│
│ 📝 𝗥𝗲𝗮𝘀𝗼𝗻: ${reason}
│ 🕐 𝗦𝗶𝗻𝗰𝗲: \`\`${formatTime(since)}\`\`
╰━━━━━━━━━━━━━━━━━━━━━━╯`,
      { mentions: [sender] }
    );
  },
};
