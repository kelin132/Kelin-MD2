import { isRegistered, registerUser, REGISTRATION_STARTING_MONEY } from "./database.js";

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
        text: "❌ *You are already registered.*\n\nUse *.profile* to view your account."
      }, { quoted: msg });
    }

    const name = text?.trim();

    if (!name) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: [
          "❌ *Name required*",
          "",
          "*Usage:* .register <your_name>",
          "*Example:* .register Kelin",
          "",
          "• 2–20 characters",
          "• No special characters"
        ].join("\n")
      }, { quoted: msg });
    }

    if (name.length < 2) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ *Name too short.*\n\nMinimum: *2 characters*."
      }, { quoted: msg });
    }

    if (name.length > 20) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ *Name too long.*\n\nMaximum: *20 characters*."
      }, { quoted: msg });
    }

    await registerUser(sender, name);

    await sock.sendMessage(msg.key.remoteJid, {
      text:
        `🎉 *Welcome to AIDORU, ${name}!*\n\n` +
        `✅ *Account created successfully.*\n\n` +
        `💰 *Wallet:* $${REGISTRATION_STARTING_MONEY.toLocaleString()}\n` +
        `🏦 *Bank:* $0\n` +
        `💎 *Diamonds:* 0\n` +
        `⭐ *Level:* 1\n\n` +
        `📋 *Get Started*\n` +
        `• *.daily* — Claim your reward\n\n` +
        `🍀 *Good luck!*\n\n` +
        `🌐 Create your account on the website:\n` +
        `https://aidoru.zone.id`
    }, { quoted: msg });
  }
};