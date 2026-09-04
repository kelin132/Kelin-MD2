// plugins/pokemon/pokespawn.js
// [Mod/Owner] Enable or disable automatic Pokémon spawning in this group

import { getDb } from "../../lib/mongo.mjs";

const COLLECTION = "pokemon_autospawn_chats";

async function setPokeSpawn(chatId, enabled) {
  const db = await getDb();
  await db.collection(COLLECTION).updateOne(
    { _id: chatId },
    { $set: { enabled } },
    { upsert: true }
  );
}

async function getPokeSpawn(chatId) {
  const db  = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ _id: chatId });
  return doc?.enabled ?? false;
}

async function setDiscordPokeSpawn(guildId, channelId, enabled) {
  const db = await getDb();
  const scopeKey = `discord:${String(guildId)}`;
  await db.collection(COLLECTION).updateOne(
    { _id: scopeKey },
    {
      $set: {
        platform: "discord",
        guildId: String(guildId),
        channelId: String(channelId),
        enabled: Boolean(enabled),
      },
    },
    { upsert: true },
  );
}

async function getDiscordPokeSpawn(guildId) {
  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({
    _id: `discord:${String(guildId)}`,
    platform: "discord",
  });
  return doc?.enabled === true;
}

export default {
  name:        "pokespawn",
  aliases:     ["pokeautospawn", "wildautospawn"],
  description: "[Mod] Enable/disable automatic Pokémon spawning every 10 min",
  category:    "pokemon",
  usage:       ".pokespawn on | off | status",
  isMod:       true,
  discordAdmin: true,

  async run({ sock, msg, sender, args, discord }) {
    const discordMessage = discord?.message;
    if (discordMessage?.guild) {
      const channelId = discordMessage.channelId;
      const guildId = discordMessage.guild.id;
      const sub = (args[0] || "status").toLowerCase();
      if (sub === "on" || sub === "enable") {
        await setDiscordPokeSpawn(guildId, channelId, true);
        return discordMessage.reply("✅ Pokémon auto-spawn enabled in this Discord channel.");
      }
      if (sub === "off" || sub === "disable") {
        await setDiscordPokeSpawn(guildId, channelId, false);
        return discordMessage.reply("❌ Pokémon auto-spawn disabled in this Discord channel.");
      }
      const enabled = await getDiscordPokeSpawn(guildId);
      return discordMessage.reply(
        `🌿 **Pokémon Auto-Spawn**\n\nStatus: ${enabled ? "✅ Enabled" : "❌ Disabled"}\n` +
        "Interval: every 15–20 minutes\n\nUse `.pokespawn on` or `.pokespawn off`.",
      );
    }

    const jid = msg.key.remoteJid;
    const sub = (args[0] || "status").toLowerCase();

    if (sub === "on" || sub === "enable") {
      await setPokeSpawn(jid, true);
      return sock.sendMessage(jid, {
        text: "✅ *Pokémon auto-spawn ENABLED!*\nA wild Pokémon will appear every *10 minutes* in this group.",
      }, { quoted: msg });
    }

    if (sub === "off" || sub === "disable") {
      await setPokeSpawn(jid, false);
      return sock.sendMessage(jid, {
        text: "❌ *Pokémon auto-spawn DISABLED.*\nNo more automatic wild Pokémon in this group.",
      }, { quoted: msg });
    }

    // status
    const enabled = await getPokeSpawn(jid);
    return sock.sendMessage(jid, {
      text:
`🌿 *Pokémon Auto-Spawn*

Status: ${enabled ? "✅ Enabled" : "❌ Disabled"}
Interval: every *10 minutes*

*.pokespawn on* — enable
*.pokespawn off* — disable`,
    }, { quoted: msg });
  },
};
