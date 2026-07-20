// plugins/naruto/ntrain.js
// Train your ninja — shows Might Guy / Rock Lee training art

import players from "../../lib/naruto/players.js";
import { randomInt } from "../../lib/naruto/utils.js";
import { sendWithCharacterImage } from "../../lib/gifHelper.mjs";

// Alternate training characters for variety
const TRAINERS = ["Might Guy", "Rock Lee", "Kakashi Hatake", "Jiraiya"];

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
        player.maxHp     += 20;
        player.maxChakra += 15;
        player.attack    += 3;
        player.defense   += 2;
        player.speed     += 2;
        player.hp     = player.maxHp;
        player.chakra = player.maxChakra;
        levelUp = `\n\n🎉 *LEVEL UP!* You are now Level ${player.level}!`;
      }

      await player.save();

      const trainer = TRAINERS[Math.floor(Math.random() * TRAINERS.length)];

      return sendWithCharacterImage(sock, jid, msg,
`💪 *TRAINING SESSION*

🥷 ${player.username} trained hard!

📈 *Gains*
⚔️ Attack: +${gainAtk}
🛡️ Defense: +${gainDef}
💨 Speed: +${gainSpd}
✨ XP: +${gainXP}

📊 *Current Stats*
⭐ Level: ${player.level}
⚔️ Attack: ${player.attack}
🛡️ Defense: ${player.defense}
💨 Speed: ${player.speed}
✨ XP: ${player.xp}/${player.xpNeeded}

⏳ Next training: 15 minutes${levelUp}`,
        trainer, "train");

    } catch (err) {
      console.error("NTRAIN ERROR:", err);
      return sock.sendMessage(jid, { text: "❌ Training failed." }, { quoted: msg });
    }
  }
};
