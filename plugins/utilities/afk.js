import { afkUsers } from "../../lib/pluginManager.mjs";

export default {
  name: "afk",
  description: "Set yourself as AFK (Away From Keyboard)",
  category: "utilities",
  usage: ".afk [reason]",
  aliases: [],
  cooldown: 5,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg, text, sender }) {
    const jid    = msg.key.remoteJid;
    const reason = text || "No reason given";

    if (afkUsers.has(sender)) {
      afkUsers.delete(sender);
      return sock.sendMessage(jid, { text: "✅ Your AFK status has been removed." }, { quoted: msg });
    }

    afkUsers.set(sender, { reason, time: Date.now() });
    await sock.sendMessage(jid, {
      text: `😴 You are now *AFK*\nReason: _${reason}_\n\nYou'll be automatically unmarked when you send a message.`,
    }, { quoted: msg });
  },
};
