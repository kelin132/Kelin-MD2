// plugins/naruto/ntrain.js

import players from "../../lib/naruto/players.js";
import { randomInt } from "../../lib/naruto/utils.js";
import { sendWithGif } from "../../lib/gifHelper.mjs";

export default {
  name: "ntrain",
  description: "Train your ninja and gain power",
  category: "naruto",
  usage: ".ntrain",
  cooldown: 900,

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
      const cooldownMs = 15 * 60 * 1000;

      if (player.cooldowns?.train && now < player.cooldowns.train) {
        const remaining = Math.ceil((player.cooldowns.train - now) / 60000);
        return sock.sendMessage(jid, {
          text: `⏳ You are exhausted!\n\nRest for *${remaining} more minute(s)* before training again.`
        }, { quoted: msg });
      }

      const gainAtk = randomInt(1, 3);
      const gainDef = randomInt(1, 2);
      const gainSpd = randomInt(1, 2);
      const gainXP  = randomInt(20, 50);

      player.attack  += gainAtk;
      player.defense += gainDef;
      player.speed   += gainSpd;
      player.xp      += gainXP;

      if (!player.cooldowns) player.cooldowns = {};
      player.cooldowns.train = now + cooldownMs;

      let levelUp = "";
      if (player.xp >= player.xpNeeded) {
        player.xp      -= player.xpNeeded;
        player.level++;
        player.xpNeeded = Math.floor(player.xpNeeded * 1.25);
        player.maxHp   += 20;
        player.maxChakra += 15;
        player.hp       = player.maxHp;
        player.chakra   = player.maxChakra;
        levelUp = `\n\n🎉 *LEVEL UP!* You are now Level ${player.level}!`;
      }

      await player.save();

      return sendWithGif(sock, jid, msg,
`💪 *TRAINING COMPLETE*

🥷 ${player.username}

📈 *Gains*
⚔️ Attack: +${gainAtk}
🛡️ Defense: +${gainDef}
💨 Speed: +${gainSpd}
✨ XP: +${gainXP}

📊 *Current Stats*
⭐ Level: ${player.level}
✨ XP: ${player.xp}/${player.xpNeeded}
⚔️ Attack: ${player.attack}
🛡️ Defense: ${player.defense}
💨 Speed: ${player.speed}

⏳ Next training in 15 minutes.${levelUp}`, "naruto training");

    } catch (err) {
      console.error("NTRAIN ERROR:", err);
      return sock.sendMessage(jid, { text: "❌ Training failed." }, { quoted: msg });
    }
  }
};
