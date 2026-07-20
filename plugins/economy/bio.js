import { getUser, saveUser, requireRegistration } from "./database.js";

export default {
  name: "bio",
  aliases: ["setbio"],
  category: "economy",
  description: "Set your profile bio",
  usage: ".bio <text>",

  async run({ sock, msg, sender, text: rawText }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });
    const value = rawText.trim();

    if (!value) {
      const user = await getUser(sender);
      return reply(`📖 *Your Bio:*\n\n${user.bio || "No bio set."}\n\n_Use .bio <text> to change it._`);
    }

    if (value.length > 120) return reply("❌ Bio must be 120 characters or less.");

    const user = await getUser(sender);
    user.bio   = value;
    await saveUser(sender, user);

    return reply(`✅ *Bio updated!*\n\n📖 "${value}"`);
  },
};
