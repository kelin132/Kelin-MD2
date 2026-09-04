import { claimWhatsAppLink, resolveDiscordAccount, unlinkDiscordAccount } from "../../lib/accountLink.mjs";

export default {
  name: "connect",
  description: "Link your WhatsApp progress to Discord",
  category: "main",
  usage: ".connect <code>  — or .connect status / .connect remove",
  aliases: ["connectaccount", "connectdiscord", "linkaccount"],
  cooldown: 5,

  async run({ sock, msg, text, rawSender }) {
    const discordId = String(rawSender || "");
    const action = String(text || "").trim();
    const reply = (content) => sock.sendMessage(msg.key.remoteJid, { text: content }, { quoted: msg });

    if (!action) {
      return reply(
        "🔗 *Link your WhatsApp progress*\n\n" +
        "1. Open the WhatsApp bot and send *.discordlink*\n" +
        "2. Copy the one-time code it gives you\n" +
        "3. Return here and send *.connect CODE*\n\n" +
        "The code expires after 10 minutes and can only be used once.",
      );
    }

    const command = action.toLowerCase();
    if (command === "status") {
      const linked = await resolveDiscordAccount(discordId);
      return reply(linked
        ? `✅ This Discord account is linked to WhatsApp identity \`${linked}\`.\nYour shared progress is active.`
        : "ℹ️ This Discord account is not linked yet.\nUse *.connect* to see the setup steps.");
    }

    if (command === "remove" || command === "unlink") {
      const removed = await unlinkDiscordAccount(discordId);
      return reply(removed
        ? "✅ Your Discord link was removed. Your WhatsApp progress remains safe."
        : "ℹ️ This Discord account does not have an active WhatsApp link.");
    }

    const result = await claimWhatsAppLink(action.split(/\s+/)[0], discordId);
    if (!result) {
      return reply("❌ That link code is invalid, expired, or already used.\n\nGenerate a new one with *.discordlink* on WhatsApp.");
    }

    return reply(
      "✅ *WhatsApp and Discord linked successfully!*\n\n" +
      "Your Discord commands now use your existing WhatsApp progress. " +
      "You can safely use economy, Pokémon, cards, guild, and profile commands here.",
    );
  },
};