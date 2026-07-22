// plugins/naruto/nsteal.js
// Attempt to steal Ryo from another ninja — thief theme with Itachi/Deidara art

import players from "../../lib/naruto/players.js";
import { chance, randomInt } from "../../lib/naruto/utils.js";
import { sendWithCharacterImage } from "../../lib/gifHelper.mjs";

const STEAL_COOLDOWN_MS = 20 * 60 * 1000; // 20 minutes
const SUCCESS_RATE = 0.45; // 45% success chance
const MAX_STEAL_PERCENT = 0.15; // steal up to 15% of target's ryo

export default {
  name: "nsteal",
  description: "Attempt to steal Ryo from another ninja",
  category: "naruto",
  usage: ".nsteal @user",
  aliases: ["nrob", "nthief"],
  cooldown: 5,

  async run({ sock, msg, sender, text }) {
    const jid = msg.key.remoteJid;

    try {
      const player = await players.get(sender);

      if (!player) {
        return sock.sendMessage(jid, {
          text: "🥷 You don't have a ninja profile.\n\nUse .nstart first."
        }, { quoted: msg });
      }

      const now = Date.now();
      if (player.cooldowns?.steal && now < player.cooldowns.steal) {
        const remaining = Math.ceil((player.cooldowns.steal - now) / 60000);
        return sock.sendMessage(jid, {
          text: `🕵️ You are still lying low after your last heist!\n\nTry again in *${remaining} more minute(s)*.`
        }, { quoted: msg });
      }

      // Resolve target from mention or quoted message
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      const targetJid =
        ctx?.mentionedJid?.[0] ||
        ctx?.participant ||
        null;

      if (!targetJid) {
        return sock.sendMessage(jid, {
          text: "🎯 Tag the ninja you want to steal from!\n\nUsage: *.nsteal @user*"
        }, { quoted: msg });
      }

      if (targetJid === sender) {
        return sock.sendMessage(jid, {
          text: "❌ You can't steal from yourself!"
        }, { quoted: msg });
      }

      const target = await players.get(targetJid);

      if (!target) {
        return sock.sendMessage(jid, {
          text: "❌ That ninja doesn't have a profile yet."
        }, { quoted: msg });
      }

      if (target.ryo < 100) {
        return sock.sendMessage(jid, {
          text: `💸 @${targetJid.split("@")[0]} is too broke to rob! They only have ${target.ryo} Ryo.`,
          mentions: [targetJid]
        }, { quoted: msg });
      }

      if (!player.cooldowns) player.cooldowns = {};
      player.cooldowns.steal = now + STEAL_COOLDOWN_MS;

      const succeeded = chance(SUCCESS_RATE);
      const THIEVES = ["Itachi Uchiha", "Deidara", "Kisame Hoshigaki"];
      const char = THIEVES[Math.floor(Math.random() * THIEVES.length)];

      if (succeeded) {
        const stolen = Math.max(50, Math.floor(target.ryo * MAX_STEAL_PERCENT));
        player.ryo += stolen;
        target.ryo -= stolen;

        await Promise.all([player.save(), target.save()]);

        return sendWithCharacterImage(sock, jid, msg,
`🎭 *HEIST SUCCESSFUL!*

💰 Stole *${stolen} Ryo* from @${targetJid.split("@")[0]}!

💳 Your Ryo: ${player.ryo}
🎯 Their Ryo: ${target.ryo}

⏳ Lie low for *20 minutes* before striking again.`,
          char, "battle",
          { mentions: [targetJid] });
      } else {
        // Failed steal — small penalty
        const penalty = Math.min(player.ryo, randomInt(50, 150));
        player.ryo -= penalty;
        await player.save();

        return sendWithCharacterImage(sock, jid, msg,
`😤 *CAUGHT RED-HANDED!*

@${targetJid.split("@")[0]} caught you trying to steal!
You dropped *${penalty} Ryo* fleeing the scene.

💳 Your Ryo: ${player.ryo}

⏳ Stay hidden for *20 minutes*.`,
          char, "defeat",
          { mentions: [targetJid] });
      }

    } catch (err) {
      console.error("NSTEAL ERROR:", err);
      return sock.sendMessage(jid, { text: "❌ Steal failed." }, { quoted: msg });
    }
  }
};
