import {
  isSpawnEnabled,
  setSpawnEnabled,
  isDiscordSpawnEnabled,
  setDiscordSpawnEnabled,
} from "./db.js";

export default {
  name: "cardspawn",
  aliases: ["spawncard", "cardauto"],
  description: "Enable or disable automatic card spawning every 15 minutes (group admins only)",
  category: "cards",
  usage: ".cardspawn on | .cardspawn off | .cardspawn status",
  isAdmin: true,
  isOwner: true,

  async run({ sock, msg, args, discord }) {
    const discordMessage = discord?.message;
    if (discordMessage?.guild) {
      const channelId = discordMessage.channelId;
      const guildId = discordMessage.guild.id;
      const sub = (args[0] ?? "status").toLowerCase();

      if (sub === "status") {
        const enabled = await isDiscordSpawnEnabled(guildId);
        return discordMessage.reply(
          `🃏 **Automatic Card Spawn**\n\nStatus: ${enabled ? "✅ ON" : "❌ OFF"}\n` +
          "This channel receives a random card every 15–25 minutes.\n\nUse `.cardspawn on` or `.cardspawn off`.",
        );
      }
      if (sub === "on") {
        await setDiscordSpawnEnabled(guildId, channelId, true);
        return discordMessage.reply("✅ Automatic card spawning enabled in this Discord channel.");
      }
      if (sub === "off") {
        await setDiscordSpawnEnabled(guildId, channelId, false);
        return discordMessage.reply("❌ Automatic card spawning disabled in this Discord channel.");
      }
      return discordMessage.reply("❌ Usage: `.cardspawn on`, `.cardspawn off`, or `.cardspawn status`.");
    }

    const chatId = msg.key.remoteJid;

    if (!chatId.endsWith("@g.us")) {
      await sock.sendMessage(chatId, { text: "❌ This command only works in groups." }, { quoted: msg });
      return;
    }

    const sub = (args[0] ?? "status").toLowerCase();

    if (sub === "status") {
      const enabled = await isSpawnEnabled(chatId);
      await sock.sendMessage(chatId, {
        text: `🃏 *Auto Card Spawn*\n\nStatus: ${enabled ? "✅ *ON*" : "❌ *OFF*"}\n\nUse *.cardspawn on* / *.cardspawn off* to change.`,
      }, { quoted: msg });
      return;
    }

    if (sub === "on") {
      await setSpawnEnabled(chatId, true);
      await sock.sendMessage(chatId, {
        text:
`✅ *Auto Card Spawn: ON*

A random card will appear in this group every *15 minutes*.
Members can use *.collect* to grab it — first come, first served!`,
      }, { quoted: msg });
      return;
    }

    if (sub === "off") {
      await setSpawnEnabled(chatId, false);
      await sock.sendMessage(chatId, {
        text: "❌ *Auto Card Spawn: OFF*\n\nNo more automatic cards in this group.",
      }, { quoted: msg });
      return;
    }

    await sock.sendMessage(chatId, {
      text: "❌ Usage: *.cardspawn on* | *.cardspawn off* | *.cardspawn status*",
    }, { quoted: msg });
  },
};
