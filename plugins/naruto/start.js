// plugins/naruto/start.js (nstart)

import players from "../../lib/naruto/players.js";
import villages from "../../lib/naruto/villages.js";
import clans from "../../lib/naruto/clans.js";
import { random } from "../../lib/naruto/utils.js";
import { sendWithGif } from "../../lib/gifHelper.mjs";

export default {
  name: "nstart",
  description: "Create your Naruto ninja profile",
  category: "naruto",
  usage: ".nstart",

  async run({ sock, msg, sender }) {
    const jid = msg.key.remoteJid;

    try {
      const existing = await players.get(sender);

      if (existing) {
        return sock.sendMessage(jid, {
          text: "🥷 You already have a ninja profile!\n\nUse .nprofile to view your stats."
        }, { quoted: msg });
      }

      const village = random(villages);
      const clan    = random(clans);

      const baseHp     = 100 + (clan.bonus?.hp     || 0);
      const baseChakra = 100 + (clan.bonus?.chakra  || 0);
      const baseAtk    = 10  + (clan.bonus?.attack  || 0);
      const baseDef    = 10  + (clan.bonus?.defense || 0);
      const baseSpd    = 10  + (clan.bonus?.speed   || 0);

      const player = await players.create({
        jid: sender,
        username:     msg.pushName || "Unknown Ninja",
        village:      { id: village.id, name: village.name, emoji: village.emoji },
        clan:         { name: clan.name, ability: clan.ability },
        rank:         "Academy Student",
        title:        "Rookie Ninja",
        level:        1,
        xp:           0,
        xpNeeded:     100,
        hp:           baseHp,
        maxHp:        baseHp,
        chakra:       baseChakra,
        maxChakra:    baseChakra,
        attack:       baseAtk,
        defense:      baseDef,
        speed:        baseSpd,
        ryo:          500,
        wins:         0,
        losses:       0,
        jutsu:        [{ id: "basic_taijutsu", name: "Basic Taijutsu" }],
        inventory:    [],
        createdAt:    new Date(),
      });

      await player.save();

      return sendWithGif(sock, jid, msg,
`🍃 *NINJA REGISTRATION COMPLETE* 🍃

🥷 Name: *${player.username}*
🏯 Village: ${village.emoji} *${village.name}*
👁️ Clan: *${clan.name}*
🌟 Clan Ability: ${clan.ability}

⭐ Rank: Academy Student
❤️ HP: ${player.hp}/${player.maxHp}
💙 Chakra: ${player.chakra}/${player.maxChakra}
⚔️ Attack: ${player.attack}
🛡️ Defense: ${player.defense}
💨 Speed: ${player.speed}
💰 Starting Ryo: 500

Your ninja journey begins! 🥷
Use *.nprofile* | *.nmission* | *.ntrain*`, "naruto begin journey");

    } catch (err) {
      console.error("NSTART ERROR:", err);
      return sock.sendMessage(jid, { text: "❌ Failed to create ninja profile." }, { quoted: msg });
    }
  }
};
