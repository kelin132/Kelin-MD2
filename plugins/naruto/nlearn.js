// plugins/naruto/nlearn.js

import players from "../../lib/naruto/players.js";
import jutsuList from "../../lib/naruto/jutsu.js";

export default {
  name: "nlearn",
  description: "Learn new ninja techniques",
  category: "naruto",
  usage: ".nlearn <jutsu_id>",

  async run({ sock, msg, sender, text }) {

    const jid = msg.key.remoteJid;

    try {

      const player = await players.get(sender);

      if (!player) {
        return sock.sendMessage(jid, {
          text:
`🥷 You don't have a ninja profile.

Use .nstart first.`
        }, { quoted: msg });
      }

      // No argument — show available jutsu
      if (!text) {
        const available = jutsuList
          .filter(j => !j.clan || player.clan?.name === j.clan)
          .map(j => {
            const cost       = j.level * 100;
            const canAfford  = player.ryo >= cost;
            const levelOk    = player.level >= j.level;
            const alreadyHas = player.jutsu?.some(k => k.id === j.id);
            const status     = alreadyHas ? "✅ Learned" : (!levelOk ? `🔒 Lv ${j.level}` : (!canAfford ? `💸 ${cost} Ryo` : "📖 Available"));
            return `*${j.name}* (${j.id})\nRank: ${j.rank} | Cost: ${cost} Ryo | ${status}`;
          })
          .join("\n\n");

        return sock.sendMessage(jid, {
          text:
`📜 *JUTSU LIST*

${available || "No jutsu available for your clan/level."}

Use *.nlearn <jutsu_id>* to learn one.
Example: .nlearn shadow_clone`
        }, { quoted: msg });
      }

      const jutsuId = text.trim().toLowerCase();
      const jutsu   = jutsuList.find(j => j.id === jutsuId);

      if (!jutsu) {
        return sock.sendMessage(jid, {
          text:
`❌ Jutsu "*${jutsuId}*" not found.

Use *.nlearn* (no argument) to see available techniques.`
        }, { quoted: msg });
      }

      if (player.level < jutsu.level) {
        return sock.sendMessage(jid, {
          text:
`⚠️ Your level is too low!

Required: Level ${jutsu.level}
Your level: ${player.level}`
        }, { quoted: msg });
      }

      if (jutsu.clan && player.clan?.name !== jutsu.clan) {
        return sock.sendMessage(jid, {
          text:
`❌ Clan restriction!

This jutsu requires the *${jutsu.clan}* clan.
Your clan: ${player.clan?.name || "None"}`
        }, { quoted: msg });
      }

      const alreadyKnown = player.jutsu?.some(j => j.id === jutsu.id);
      if (alreadyKnown) {
        return sock.sendMessage(jid, {
          text: `🌀 You already know *${jutsu.name}*!`
        }, { quoted: msg });
      }

      const cost = jutsu.level * 100;
      if (player.ryo < cost) {
        return sock.sendMessage(jid, {
          text:
`💰 Not enough Ryo!

Cost: ${cost} Ryo
Your Ryo: ${player.ryo}`
        }, { quoted: msg });
      }

      // Deduct cost and learn
      player.ryo -= cost;
      if (!Array.isArray(player.jutsu)) player.jutsu = [];
      player.jutsu.push({ id: jutsu.id, name: jutsu.name });
      await player.save();

      await sock.sendMessage(jid, {
        text:
`🎉 *JUTSU LEARNED!*

🌀 ${jutsu.name}
⭐ Rank: ${jutsu.rank}
💥 Type: ${jutsu.type}
⚡ Damage: ${jutsu.damage}
💙 Chakra cost: ${jutsu.chakra}

💰 Ryo spent: ${cost}
💰 Ryo remaining: ${player.ryo}`
      }, { quoted: msg });

    } catch (err) {
      console.error("NLEARN ERROR:", err);
      await sock.sendMessage(jid, {
        text: "❌ Failed to learn jutsu. Please try again."
      }, { quoted: msg });
    }
  }
};
