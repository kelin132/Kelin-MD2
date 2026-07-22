// plugins/naruto/ndaily.js
// Claim daily Ryo reward — shows Naruto art

import players from "../../lib/naruto/players.js";
import { sendWithCharacterImage } from "../../lib/gifHelper.mjs";

const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

const DAILY_BASE = 500;
const LEVEL_BONUS = 50; // extra ryo per level

export default {
  name: "ndaily",
  description: "Claim your daily Ryo reward",
  category: "naruto",
  usage: ".ndaily",
  aliases: ["nreward", "nclaim"],
  cooldown: 5,

  async run({ sock, msg, sender }) {
    const jid = msg.key.remoteJid;

    try {
      const player = await players.get(sender);

      if (!player) {
        return sock.sendMessage(jid, {
          text: "🥷 You don't have a ninja profile.\n\nUse .nstart first."
        }, { quoted: msg });
      }

      const now = Date.now();
      if (player.cooldowns?.daily && now < player.cooldowns.daily) {
        const remaining = Math.ceil((player.cooldowns.daily - now) / 3600000);
        const remainingMin = Math.ceil(((player.cooldowns.daily - now) % 3600000) / 60000);
        return sock.sendMessage(jid, {
          text: `⏳ You already claimed your daily reward!\n\nCome back in *${remaining}h ${remainingMin}m*.`
        }, { quoted: msg });
      }

      const reward = DAILY_BASE + (player.level * LEVEL_BONUS);
      player.ryo += reward;

      if (!player.cooldowns) player.cooldowns = {};
      player.cooldowns.daily = now + DAILY_COOLDOWN_MS;

      await player.save();

      return sendWithCharacterImage(sock, jid, msg,
`🎁 *DAILY REWARD CLAIMED!*

💰 +${reward} Ryo
💳 Total Ryo: ${player.ryo}

🌟 Level Bonus: +${player.level * LEVEL_BONUS} Ryo (Level ${player.level})

Come back tomorrow for your next reward!
Higher level = bigger daily bonus 🥷`,
        "Naruto Uzumaki", "victory");

    } catch (err) {
      console.error("NDAILY ERROR:", err);
      return sock.sendMessage(jid, { text: "❌ Daily reward error." }, { quoted: msg });
    }
  }
};
