// plugins/naruto/nmeditate.js
// Meditate to restore Chakra — shows Naruto/Minato art

import players from "../../lib/naruto/players.js";
import { sendWithCharacterImage } from "../../lib/gifHelper.mjs";

const MEDITATE_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const RESTORE_PERCENT = 0.4; // restore 40% of max chakra

export default {
  name: "nmeditate",
  description: "Meditate to restore Chakra for free",
  category: "naruto",
  usage: ".nmeditate",
  aliases: ["nmed", "nchakra"],
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
      if (player.cooldowns?.meditate && now < player.cooldowns.meditate) {
        const remaining = Math.ceil((player.cooldowns.meditate - now) / 60000);
        return sock.sendMessage(jid, {
          text: `🧘 Your mind is still settling.\n\nMeditate again in *${remaining} more minute(s)*.`
        }, { quoted: msg });
      }

      const missingChakra = player.maxChakra - player.chakra;
      if (missingChakra <= 0) {
        return sock.sendMessage(jid, {
          text: "💙 Your Chakra is already full — no need to meditate!"
        }, { quoted: msg });
      }

      const restored = Math.min(missingChakra, Math.ceil(player.maxChakra * RESTORE_PERCENT));
      player.chakra = Math.min(player.maxChakra, player.chakra + restored);

      if (!player.cooldowns) player.cooldowns = {};
      player.cooldowns.meditate = now + MEDITATE_COOLDOWN_MS;

      await player.save();

      const MEDITATORS = ["Naruto Uzumaki", "Minato Namikaze", "Hashirama Senju"];
      const char = MEDITATORS[Math.floor(Math.random() * MEDITATORS.length)];

      return sendWithCharacterImage(sock, jid, msg,
`🧘 *MEDITATION COMPLETE*

💙 Chakra Restored: +${restored}
💙 Chakra: ${player.chakra}/${player.maxChakra}

You draw upon your inner chakra network.
Next meditation available in *5 minutes*.

Tip: Visit *.nheal* to restore both HP & Chakra for Ryo.`,
        char, "jutsu");

    } catch (err) {
      console.error("NMEDITATE ERROR:", err);
      return sock.sendMessage(jid, { text: "❌ Meditation failed." }, { quoted: msg });
    }
  }
};
