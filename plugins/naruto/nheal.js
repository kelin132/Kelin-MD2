// plugins/naruto/nheal.js
// Visit the Konoha Hospital to restore HP & Chakra for Ryo — shows Shizune/Tsunade art

import players from "../../lib/naruto/players.js";
import { sendWithCharacterImage } from "../../lib/gifHelper.mjs";

const HEAL_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const RYO_PER_HP     = 3;
const RYO_PER_CHAKRA = 1;
const MIN_CHARGE     = 50;

export default {
  name: "nheal",
  description: "Visit the hospital to restore HP & Chakra for Ryo",
  category: "naruto",
  usage: ".nheal",
  aliases: ["nhospital"],
  cooldown: 10, // display-only metadata; real enforcement is via player.cooldowns.heal below

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
      if (player.cooldowns?.heal && now < player.cooldowns.heal) {
        const remaining = Math.ceil((player.cooldowns.heal - now) / 60000);
        return sock.sendMessage(jid, {
          text: `⏳ The medics need to rest!\n\nCome back in *${remaining} more minute(s)*.`
        }, { quoted: msg });
      }

      const missingHp     = Math.max(0, player.maxHp - player.hp);
      const missingChakra = Math.max(0, player.maxChakra - player.chakra);

      if (missingHp === 0 && missingChakra === 0) {
        return sock.sendMessage(jid, {
          text: "💚 You're already at full HP and Chakra — no need to visit the hospital!"
        }, { quoted: msg });
      }

      const cost = Math.max(
        MIN_CHARGE,
        missingHp * RYO_PER_HP + missingChakra * RYO_PER_CHAKRA
      );

      if (player.ryo < cost) {
        return sock.sendMessage(jid, {
          text: `💰 Not enough Ryo for treatment!\n\nCost: ${cost} Ryo\nYour Ryo: ${player.ryo}\n\nTip: partial healing still costs the same flat rate — save up first.`
        }, { quoted: msg });
      }

      player.ryo -= cost;
      player.hp = player.maxHp;
      player.chakra = player.maxChakra;

      if (!player.cooldowns) player.cooldowns = {};
      player.cooldowns.heal = now + HEAL_COOLDOWN_MS;

      await player.save();

      return sendWithCharacterImage(sock, jid, msg,
`🏥 *HOSPITAL TREATMENT COMPLETE*

❤️ HP: ${player.hp}/${player.maxHp}
💙 Chakra: ${player.chakra}/${player.maxChakra}
💰 Paid: ${cost} Ryo
💳 Remaining: ${player.ryo} Ryo

Rest up, ninja. You can visit again in 10 minutes.`,
        "Shizune", "hospital");

    } catch (err) {
      console.error("NHEAL ERROR:", err);
      return sock.sendMessage(jid, { text: "❌ Hospital error." }, { quoted: msg });
    }
  }
};
