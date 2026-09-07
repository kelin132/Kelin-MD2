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

  async run({ sock, msg, sender, text: rawText, discord }) {
    const jid   = msg.key.remoteJid;
    const discordMessage = discord?.message;
    const reply = (t, options = {}) => sock.sendMessage(
      jid,
      { text: t, ...options },
      { quoted: msg },
    );
    const user  = await getUser(sender);
    const reason = (rawText || "").trim() || "No reason given";
    const tag    = sender.split("@")[0].split(":")[0];
    const name =
      discordMessage?.member?.displayName ||
      discordMessage?.author?.globalName ||
      discordMessage?.author?.username ||
      user.name ||
      tag;
    const displayName = name;
    const mentions = discordMessage ? [] : [sender];

    const existingAfk = user.afk?.active
      ? {
          reason: user.afk.message || user.afk.reason || "No reason given",
          time: user.afk.since || Date.now(),
        }
      : getAfkUser(sender);

    // ── Already AFK — update the reason and reset the timer ─────────────────
    if (existingAfk) {
      const since = Date.now();
      user.afk = { active: true, message: reason, since };
      await saveUser(sender, user);

      setAfkUser(sender, {
        reason,
        time:     since,
        username: name,
      });

      return reply(
`💤 **${displayName} is still AFK**
Reason: ${reason}
Reset: ${formatTime(since)}`,
        { mentions }
      );
    }

    // ── Set AFK ───────────────────────────────────────────────────────────────
    const since = Date.now();
    user.afk = { active: true, message: reason, since };
    await saveUser(sender, user);

    setAfkUser(sender, {
      reason,
      time:     since,
      username: name,
    });

    return reply(
`🌙 **${displayName} is now AFK**
Reason: ${reason}
Since: ${formatTime(since)}`,
      { mentions }
    );
  },
};
