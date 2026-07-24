import { isRegistered, registerUser } from "./database.js";

export default {
  name: "register",
  description: "Register your account to access economy commands",
  category: "economy",
  usage: ".register <your_name>",
  aliases: ["reg", "signup"],
  cooldown: 5,

  async run({ sock, msg, sender, text }) {
    const already = await isRegistered(sender);

    if (already) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "✅ You are already registered!\n\n💡 Use *.profile* to view your account."
      }, { quoted: msg });
    }

    const name = text?.trim();

    // Name is required — no auto-generation
    if (!name) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: [
          `❌ *You must provide a name to register!*`,
          ``,
          `Usage: *.register <your_name>*`,
          `Example: *.register Kelin*`,
          ``,
          `• Name must be 2–20 characters`,
          `• No special characters`,
        ].join("\n")
      }, { quoted: msg });
    }

    if (name.length < 2) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ Name is too short! Minimum 2 characters.\n\nExample: *.register Kelin*"
      }, { quoted: msg });
    }

    if (name.length > 20) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ Name is too long! Maximum 20 characters.\n\nExample: *.register Kelin*"
      }, { quoted: msg });
    }

    await registerUser(sender, name);

    await sock.sendMessage(msg.key.remoteJid, {
      text: `🎉 *Welcome to AKIRA Economy, ${name}!*\n\n✅ Account created successfully!\n\n` +
            `💰 Starting Balance : $1,000\n🏦 Bank Balance     : $0\n⭐ Level            : 1\n\n` +
            `📋 *Get started:*\n• *.daily* — Claim daily reward\n• *.work* — Earn money working\n• *.balance* — Check your wallet\n• *.shop* — Buy items\n• *.guildhelp* — Join a guild\n\nGood luck! 🍀`
    }, { quoted: msg });
  }
};
