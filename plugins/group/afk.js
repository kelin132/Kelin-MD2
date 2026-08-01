/**
 * KELIN MD — .afk command (Anime Edition)
 *
 * Sets AFK status with an anime-styled message.
 * Auto-removal happens in bot.mjs when the user sends any message.
 * The user does NOT need to type .afk again to come back — it clears automatically.
 */
import { getUser, saveUser, requireRegistration } from "../economy/database.js";
import { afkUsers } from "../../lib/pluginManager.mjs";

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
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });
    const user  = await getUser(sender);
    const reason = (rawText || "").trim() || "No reason given";
    const tag    = sender.split("@")[0].split(":")[0];
    const name   = user.name || tag;

    // ── Already AFK — just let them know auto-clear handles it ───────────────
    if (user.afk?.active) {
      return reply(
`┌──────────────────────────┐
│  💤 *Already AFK, ${name}~* │
└──────────────────────────┘

あなたはもうAFKです！
Just send any message and I'll automatically mark you as back online~

_No need to type .afk again!_ 🌸`
      );
    }

    // ── Set AFK ───────────────────────────────────────────────────────────────
    const since = Date.now();
    user.afk = { active: true, message: reason, since };
    await saveUser(sender, user);

    afkUsers.set(sender, {
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
