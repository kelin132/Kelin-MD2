import { getUser, saveUser, requireRegistration } from "./database.js";

export default {
  name: "afk",
  aliases: ["away"],
  category: "economy",
  description: "Set or clear your AFK status — bot will notify when you're tagged",
  usage: ".afk [reason]  |  .afk off",

  async run({ sock, msg, sender, text: rawText }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });
    const user  = await getUser(sender);
    const input = rawText.trim();

    // .afk off — clear AFK
    if (input.toLowerCase() === "off" || (user.afk?.active && !input)) {
      if (!user.afk?.active) return reply("ℹ️ You're not AFK right now.");

      const since = user.afk.since ? Math.floor((Date.now() - user.afk.since) / 60000) : 0;
      user.afk    = null;
      await saveUser(sender, user);
      return reply(`✅ *AFK cleared!*\n\nWelcome back! You were away for ~${since} minute(s).`);
    }

    // Already AFK — update reason
    const message = input || "AFK";
    user.afk = { active: true, message, since: Date.now() };
    await saveUser(sender, user);

    return reply(
`😴 *You are now AFK*

💬 Reason: _${message}_

I'll let people know you're away when they tag you.
Use *.afk off* or send any command to return.`
    );
  },
};
