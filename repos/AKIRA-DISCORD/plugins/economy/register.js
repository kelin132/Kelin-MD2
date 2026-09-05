import { isRegistered } from "./database.js";

export default {
  name: "register",
  description: "Register your account to access economy commands",
  category: "economy",
  usage: ".register",
  aliases: ["reg", "signup"],
  discordColor: "#57B894",
  discordTitle: "✅ Welcome to AKIRA Economy",
  cooldown: 5,

  async run({ sock, msg, sender }) {
    const already = await isRegistered(sender);

    if (already) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "✅ You are already registered!\n\n💡 Use *.profile* to view your account."
      }, { quoted: msg });
    }

    await sock.sendMessage(msg.key.remoteJid, {
      text: [
        "🔗 *Start your AIDORU account*",
        "",
        "AIDORU uses your WhatsApp phone number as the identity for your trainer data. Discord cannot safely create a separate account that would match your WhatsApp progress.",
        "",
        "1. Open https://aidoru.zone.id",
        "2. Register your new trainer with the WhatsApp bot using *.register YourName*.",
        "3. Return to the website and sign in with your WhatsApp country code and phone number.",
        "4. In your profile, choose *Link Discord*, or send *.discordlink* on WhatsApp and then *.connect CODE* here.",
        "",
        "After linking, Discord uses the same trainer, coins, Pokémon, cards, and other progress.",
      ].join("\n"),
    }, { quoted: msg });
  }
};
