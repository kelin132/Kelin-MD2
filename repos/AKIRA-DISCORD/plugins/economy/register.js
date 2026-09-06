import { isRegistered, registerUser } from "./database.js";
import { createAidoruOnboardingPayload } from "../../lib/discordOnboarding.mjs";

function discordRegistrationEmbed({ name, alreadyRegistered = false }) {
  const identityLine = alreadyRegistered
    ? "**Your AKIRA Economy account is ready.**"
    : `**Your AKIRA Economy account was created, ${name}!**`;

  return {
    title: alreadyRegistered
      ? "✅ AKIRA Economy Account"
      : `🎉 Welcome to AKIRA Economy, ${name}!`,
    description: [
      identityLine,
      "",
      "Your Discord account can share progress with your WhatsApp trainer.",
    ].join("\n"),
    color: "#57B894",
    fields: [
      ...(alreadyRegistered
        ? []
        : [
            { name: "Wallet", value: "$100,000", inline: true },
            { name: "Bank", value: "$0", inline: true },
            { name: "Diamonds", value: "0", inline: true },
            { name: "Level", value: "1", inline: true },
          ]),
      {
        name: "🔗 Link an existing WhatsApp account",
        value: [
          "1. On WhatsApp, send `.discord`.",
          "2. Copy the one-time code.",
          "3. Here on Discord, send `.connect CODE`.",
          "The code expires after 10 minutes and works once.",
        ].join("\n"),
      },
      {
        name: "📋 Start playing",
        value: "Use `.daily`, `.work`, `.balance`, `.shop`, `.profile`, or `.menu`.",
      },
      {
        name: "🌐 AIDORU Website",
        value: "https://aidoru.zone.id",
      },
    ],
    footer: {
      text: "✦ AIDORU • Use .connect CODE to finish linking",
    },
  };
}

export default {
  name: "register",
  description: "Register your account to access economy commands",
  category: "economy",
  usage: ".register <your_name>",
  aliases: ["reg", "signup"],
  discordColor: "#57B894",
  discordTitle: "✅ Welcome to AKIRA Economy",
  cooldown: 5,

  async run({ sock, msg, sender, text, discord }) {
    if (discord?.message) {
      return discord.message.reply(
        createAidoruOnboardingPayload(discord.message.member || discord.message.author),
      );
    }

    const send = (payload) => sock.sendMessage(
      msg.key.remoteJid,
      discord?.message ? { discordEmbed: payload } : { text: payload.text },
      { quoted: msg },
    );

    let already;
    try {
      already = await isRegistered(sender);
    } catch (error) {
      console.error("[register] could not check account:", error.stack || error.message);
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ Registration could not reach the economy database. Please try again in a moment.",
      }, { quoted: msg });
    }
    if (already) {
      return send({
        ...discordRegistrationEmbed({ alreadyRegistered: true }),
        text: "✅ You are already registered!\n\n💡 Use *.profile* to view your account.",
      });
    }

    const name = text?.trim();
    if (!name) {
      const message = [
        "❌ *You must provide a name to register!*",
        "",
        "Usage: *.register <your_name>*",
        "Example: *.register Kelin*",
        "",
        "• Name must be 2–20 characters",
        "• No special characters",
      ].join("\n");
      return send({
        title: "📝 Register for AKIRA Economy",
        description: "Choose a name to create your account.",
        color: "#FFD166",
        fields: [
          { name: "Usage", value: "`.register <your_name>`", inline: true },
          { name: "Rules", value: "2–20 characters\nNo special characters", inline: true },
        ],
        text: message,
      });
    }

    if (name.length < 2) {
      return send({
        title: "📝 Registration needs a longer name",
        description: "Name is too short. Minimum 2 characters.",
        color: "#FF5D73",
        fields: [{ name: "Example", value: "`.register Kelin`" }],
        text: "❌ Name is too short! Minimum 2 characters.\n\nExample: *.register Kelin*",
      });
    }

    if (name.length > 20) {
      return send({
        title: "📝 Registration needs a shorter name",
        description: "Name is too long. Maximum 20 characters.",
        color: "#FF5D73",
        fields: [{ name: "Example", value: "`.register Kelin`" }],
        text: "❌ Name is too long! Maximum 20 characters.\n\nExample: *.register Kelin*",
      });
    }

    try {
      await registerUser(sender, name);
    } catch (error) {
      console.error("[register] could not create account:", error.stack || error.message);
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ Registration could not save your account. Please try again in a moment.",
      }, { quoted: msg });
    }
    const welcomeText =
      `🎉 *Welcome to AKIRA Economy, ${name}!*\n\n✅ Account created successfully!\n\n` +
      "💰 Starting Balance : $100,000\n🏦 Bank Balance     : $0\n💎 Diamonds        : 0\n⭐ Level            : 1\n\n" +
      "📋 *Get started:*\n• *.daily* — Claim daily reward\n• *.work* — Earn money working\n• *.balance* — Check your wallet\n• *.shop* — Buy items\n• *.guildhelp* — Join a guild\n\n" +
      "🔗 *Already have an account on WhatsApp?*\nGo to a WhatsApp group and type *.discord* to get your existing data. Then send *.connect CODE* here.\n\n" +
      "Good luck! 🍀\n\nMake sure to create an account on the website https://aidoru.zone.id";

    return send({
      ...discordRegistrationEmbed({ name }),
      text: welcomeText,
    });
  },
};