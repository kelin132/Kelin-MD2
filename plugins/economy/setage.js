import { getUser, saveUser, requireRegistration } from "./database.js";

export default {
  name: "setage",
  aliases: ["age"],
  category: "economy",
  description: "Set your profile age",
  usage: ".setage <number>",

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });

    if (!args[0]) {
      const user = await getUser(sender);
      return reply(`🎂 *Your Age:* ${user.age ?? "Not set"}\n\n_Use .setage <number> to change it._`);
    }

    const age = parseInt(args[0]);
    if (isNaN(age) || age < 1 || age > 120) return reply("❌ Enter a valid age (1–120).");

    const user = await getUser(sender);
    user.age   = age;
    await saveUser(sender, user);

    return reply(`✅ Age set to *${age}*!`);
  },
};
