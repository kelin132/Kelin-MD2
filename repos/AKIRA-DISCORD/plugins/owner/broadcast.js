// plugins/owner/broadcast.js
// Broadcast a message or media to every group the bot is in.
import { EmbedBuilder } from "discord.js";

export default {
  name: "broadcast",
  description: "Broadcast a message to all groups",
  category: "owner",
  usage: ".broadcast #channel <message>",
  aliases: ["bc"],
  cooldown: 5,
  isOwner: true,
  isAdmin: false,
  isPremium: false,
  version: "1.1.0",

  async run({ sock, msg, sender, text, args, discord }) {
    const jid = msg.key.remoteJid;
    const discordMessage = discord?.message;

    if (discordMessage?.guild) {
      const mentionedChannel = discordMessage.mentions.channels.first();
      const rawChannel = String(args?.[0] || "").replace(/[<#>]/g, "");
      const target = mentionedChannel ||
        (rawChannel ? await discordMessage.guild.channels.fetch(rawChannel).catch(() => null) : null);
      const messageText = (args || []).slice(1).join(" ").trim();

      if (!target?.isTextBased?.() || !messageText) {
        return discordMessage.reply(
          "❌ Usage: `.broadcast #channel Your embedded announcement`",
        );
      }

      const embed = new EmbedBuilder()
        .setColor("#8B5CF6")
        .setTitle("📢 AIDORU BROADCAST")
        .setDescription(messageText)
        .setFooter({ text: "AIDORU • Official announcement" })
        .setTimestamp();
      await target.send({ embeds: [embed] });
      return discordMessage.reply(`✅ Broadcast sent to <#${target.id}>.`);
    }

    try {
      if (!text) {
        return await sock.sendMessage(jid, {
          text:
            "❌ *Usage:*\n.broadcast <message>\n\n" +
            "Example:\n.broadcast Hello everyone!"
        }, { quoted: msg });
      }

      // Send a quick ack reaction
      try {
        await sock.sendMessage(jid, {
          react: { text: "⚡", key: msg.key }
        });
      } catch { /* reactions optional */ }

      // Fetch all groups the bot participates in
      const chats  = await sock.groupFetchAllParticipating();
      const groups = Object.values(chats);

      if (!groups.length) {
        return await sock.sendMessage(jid, {
          text: "⚠️ Bot is not in any groups yet."
        }, { quoted: msg });
      }

      let success = 0;
      let failed  = 0;

      for (const group of groups) {
        try {
          await sock.sendMessage(group.id, {
            text:
              `╭━━━〔 📢 BROADCAST 〕━━━╮\n\n` +
              `${text}\n\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `> THIS MESSAGE WAS BROADCASTED BY THE OWNER\n` +
              `━━━━━━━━━━━━━━━━━━━━\n`
          });
          success++;

          // Small delay to avoid rate-limit kicks
          await new Promise(r => setTimeout(r, 500));
        } catch (err) {
          console.error(`Broadcast failed for ${group.subject}:`, err.message);
          failed++;
        }
      }

      // Done — report
      await sock.sendMessage(jid, {
        text:
          `✅ *Broadcast Complete!*\n\n` +
          `📨 Total Groups: ${groups.length}\n` +
          `✅ Sent: ${success}\n` +
          `❌ Failed: ${failed}`
      }, { quoted: msg });

    } catch (err) {
      console.error("BROADCAST ERROR:", err);
      await sock.sendMessage(jid, {
        text: `❌ Broadcast failed!\n\n${err.message}`
      }, { quoted: msg });
    }
  }
};
