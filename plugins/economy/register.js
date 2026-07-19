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

    const name = text?.trim() || `User_${sender.split("@")[0].slice(-4)}`;

    if (name.length > 20) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ Name is too long! Max 20 characters."
      }, { quoted: msg });
    }

    await registerUser(sender, name);

    await sock.sendMessage(msg.key.remoteJid, {
      text: `🎉 *Welcome to 'AKIRA* Economy, ${name}!*\n\n✅ Account created successfully!\n\n` +
            `💰 Starting Balance : $1,000\n🏦 Bank Balance     : $0\n⭐ Level            : 1\n\n` +
            `📋 *Get started:*\n• *.daily* — Claim daily reward\n• *.work* — Earn money working\n• *.balance* — Check your wallet\n• *.shop* — Buy items\n• *.guildhelp* — Join a guild\n\nGood luck! 🍀`
    }, { quoted: msg });
  }
};