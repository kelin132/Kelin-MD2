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

export default {
  name:        "pokespawn",
  aliases:     ["pokeautospawn", "wildautospawn"],
  description: "[Mod] Enable/disable automatic Pokémon spawning every 10 min",
  category:    "pokemon",
  usage:       ".pokespawn on | off | status",
  isMod:       true,

  async run({ sock, msg, sender, args }) {
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
