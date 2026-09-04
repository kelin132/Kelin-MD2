import { getUser, saveUser, requireRegistration } from "./database.js";

export default {
  name: "profile-settings",
  aliases: ["setage", "setbirthday", "setbday", "setbio"],
  description: "Set your profile information (age, birthday, bio)",
  category: "economy",
  usage: ".setage <number> | .setbirthday <text> | .setbio <text>",
  cooldown: 5,

  async run({ sock, msg, sender, args, cmd }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
    const input = args.join(" ").trim();

    if (!input) {
      return reply(`❌ Usage: \`.${cmd} <value>\`\nExample: \`.setage 20\` or \`.setbirthday 18 May\``);
    }

    const user = await getUser(sender);

    if (cmd === "setage") {
      const age = parseInt(input, 10);
      if (isNaN(age) || age < 1 || age > 100) {
        return reply("❌ Enter a valid age between 1 and 100.");
      }
      user.age = age;
      await saveUser(sender, user);
      return reply(`✅ Age updated to: *${age}*`);
    }

    if (cmd === "setbirthday" || cmd === "setbday") {
      if (input.length > 20) return reply("❌ Birthday text too long (max 20 chars).");
      user.birthday = input;
      await saveUser(sender, user);
      return reply(`✅ Birthday updated to: *${input}*`);
    }

    if (cmd === "setbio") {
      if (input.length > 100) return reply("❌ Bio too long (max 100 chars).");
      user.bio = input;
      await saveUser(sender, user);
      return reply(`✅ Bio updated to: *${input}*`);
    }
  },
};
