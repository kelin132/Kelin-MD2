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
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });
    const user  = await getUser(sender);
    const reason = (rawText || "").trim() || "No reason given";
    const tag    = sender.split("@")[0].split(":")[0];
    const name   = user.name || tag;

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
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  💤 *AFK Updated, ${name}~*  ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯
🌸 *@${tag}* is still away~
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
📝 *New reason* ꔫ ${reason}
⏰ *Timer reset* ꔫ ${formatTime(since)}
╌╌╌╌╌╌╌╌╌╌╌╌╌╌
📌 _Tag them & I'll let you know!_
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
        { mentions: [sender] }
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
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  🌙 *A F K  モ ー ド* 🌙  ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯
✦ *@${tag}* has gone away~
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
🌸 *Reason* ꔫ ${reason}
🕐 *Since*  ꔫ ${formatTime(since)}
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
📌 _Tag them & I'll let you know!_
💬 _They auto-return when they chat~_
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
      { mentions: [sender] }
    );
  },
};
