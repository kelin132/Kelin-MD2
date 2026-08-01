/**
 * AFK command — set / clear AFK status with ╭─❀ styling.
 * Stores in DB (persistent) AND syncs with the in-memory afkUsers Map
 * so bot.mjs auto-unmark works correctly when the user sends any message.
 */
import { getUser, saveUser, requireRegistration } from "./database.js";
import { afkUsers } from "../../lib/pluginManager.mjs";

export default {
  name: "afk",
  aliases: ["away"],
  category: "group",
  cooldown: 6,
  description: "Go AFK — bot will notify others and track your time away.",
  usage: ".afk [reason]",

  async run({ sock, msg, sender, text: rawText }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });
    const user  = await getUser(sender);
    const input = rawText.trim();

    // ── Already AFK → typing .afk again (no reason) clears it ───────────────
    if (user.afk?.active && !input) {
      const elapsed = user.afk.since
        ? Math.floor((Date.now() - user.afk.since) / 60000)
        : 0;

      user.afk = null;
      await saveUser(sender, user);
      afkUsers.delete(sender);

      const timeStr = elapsed < 1 ? "less than a minute" : `${elapsed} minute${elapsed === 1 ? "" : "s"}`;

      return reply(
`╭─❀「 ✅ 𝐖𝐄𝐋𝐂𝐎𝐌𝐄 𝐁𝐀𝐂𝐊 」❀─╮
│ 👋 *${user.name || "You"}* is back online!
│
│ ⏱ *Away for* :: _${timeStr}_
│
│ 🌸 Good to have you back！おかえり！
╰───────────────❀`
      );
    }

    // ── Set AFK ───────────────────────────────────────────────────────────────
    const reason = input || "No reason given";
    user.afk = { active: true, message: reason, since: Date.now() };
    await saveUser(sender, user);

    // Store username so bot.mjs can display it without an extra DB lookup
    afkUsers.set(sender, {
      reason,
      time:     user.afk.since,
      username: user.name || sender.split("@")[0].split(":")[0],
    });

    return reply(
`╭─❀「 😴 𝐀𝐅𝐊 𝐌𝐎𝐃𝐄 」❀─╮
│ 🌙 *${user.name || "You"}* is now AFK
│
│ 💬 *Reason* :: _${reason}_
│
│ 📌 Anyone who tags you will be notified.
╰───────────────❀`
    );
  },
};
