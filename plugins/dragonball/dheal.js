// plugins/dragonball/dheal.js
// Heal your fighter at Korin's Tower or Dende's Lookout

import players from "../../lib/dragonball/players.js";

const HEAL_COST_ZENI  = 300;
const HEAL_LOCATIONS  = [
  "🌿 Korin's Tower — Senzu beans restored your energy!",
  "🏯 Dende's Lookout — The Guardian's healing filled your spirit!",
  "💧 Kami's Lookout — Ancient energy flows through your body!",
  "🌸 Planet Namek — The Dragon Balls resonate, restoring your power!",
];

function random(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export default {
  name: "dheal",
  description: "Restore your Dragon Ball fighter's HP and KI",
  category: "dragonball",
  usage: ".dheal",
  aliases: ["drestore", "dsenzu"],
  cooldown: 5,

  async run({ sock, msg, sender }) {
    const jid = msg.key.remoteJid;

    try {
      const player = await players.get(sender);
      if (!player) {
        return sock.sendMessage(jid, { text: "🐉 No fighter found. Use *.dbzstart*" }, { quoted: msg });
      }

      if (player.hp >= player.maxHp && player.ki >= player.maxKi) {
        return sock.sendMessage(jid, {
          text: `✅ You're already at full power!\n❤️ ${player.hp}/${player.maxHp} | 💠 ${player.ki}/${player.maxKi}`,
        }, { quoted: msg });
      }

      if (player.zeni < HEAL_COST_ZENI) {
        return sock.sendMessage(jid, {
          text: `❌ Not enough Zeni!\n\nHealing costs *${HEAL_COST_ZENI} Zeni* (you have ${player.zeni}).`,
        }, { quoted: msg });
      }

      player.zeni -= HEAL_COST_ZENI;
      player.hp    = player.maxHp;
      player.ki    = player.maxKi;
      await player.save();

      return sock.sendMessage(jid, {
        text: [
          `💚 *FULLY HEALED!*`,
          ``,
          random(HEAL_LOCATIONS),
          ``,
          `❤️ HP: *${player.maxHp}/${player.maxHp}*`,
          `💠 KI: *${player.maxKi}/${player.maxKi}*`,
          `💰 Cost: *${HEAL_COST_ZENI} Zeni* | Remaining: *${player.zeni}*`,
          ``,
          `Ready to fight! Use *.dhunt* or *.dbattle @user*`,
        ].join("\n"),
      }, { quoted: msg });

    } catch (err) {
      console.error("DHEAL ERROR:", err);
      return sock.sendMessage(jid, { text: "❌ Healing failed. Try again." }, { quoted: msg });
    }
  },
};
