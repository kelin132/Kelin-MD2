// plugins/naruto/nvillage.js
// View your village info or see all villages — shows village art

import players from "../../lib/naruto/players.js";
import villages from "../../lib/naruto/villages.js";
import { sendWithCharacterImage } from "../../lib/gifHelper.mjs";

const VILLAGE_EMOJIS = {
  "Konohagakure": "🍃",
  "Sunagakure":   "🏜️",
  "Kirigakure":   "🌊",
  "Kumogakure":   "⚡",
  "Iwagakure":    "🪨",
  "Otogakure":    "🎵",
};

const VILLAGE_REPS = {
  "Konohagakure": "Naruto Uzumaki",
  "Sunagakure":   "Gaara",
  "Kirigakure":   "Kisame Hoshigaki",
  "Kumogakure":   "Killer Bee",
  "Iwagakure":    "Deidara",
  "Otogakure":    "Orochimaru",
};

export default {
  name: "nvillage",
  description: "View your village info or browse all villages",
  category: "naruto",
  usage: ".nvillage [all]",
  aliases: ["nv", "nvillages"],
  cooldown: 5,

  async run({ sock, msg, sender, text }) {
    const jid = msg.key.remoteJid;

    try {
      // .nvillage all — show all villages
      if (text?.trim().toLowerCase() === "all") {
        const vilList = (Array.isArray(villages) ? villages : Object.values(villages))
          .map(v => {
            const emoji = VILLAGE_EMOJIS[v.name] || "🏯";
            const bonuses = v.bonus
              ? Object.entries(v.bonus).map(([k, val]) => `+${val} ${k}`).join(", ")
              : "—";
            return `${emoji} *${v.name}*\n   Bonus: ${bonuses}`;
          }).join("\n\n");

        return sock.sendMessage(jid, {
          text: `🏯 *NINJA VILLAGES*\n\n${vilList}\n\nYour village is assigned when you use *.nstart*.`
        }, { quoted: msg });
      }

      const player = await players.get(sender);

      if (!player) {
        return sock.sendMessage(jid, {
          text: "🥷 You don't have a ninja profile.\n\nUse .nstart first, or try *.nvillage all* to browse villages."
        }, { quoted: msg });
      }

      const vilName = player.village?.name || "Unknown";
      const emoji = VILLAGE_EMOJIS[vilName] || "🏯";
      const rep = VILLAGE_REPS[vilName] || "Naruto Uzumaki";

      // Village data from library
      const vilData = (Array.isArray(villages) ? villages : Object.values(villages))
        .find(v => v.name === vilName) || {};

      const bonuses = vilData.bonus
        ? Object.entries(vilData.bonus).map(([k, val]) => `+${val} ${k.toUpperCase()}`).join("  ")
        : "—";

      return sendWithCharacterImage(sock, jid, msg,
`${emoji} *YOUR VILLAGE: ${vilName}*

🏯 Hidden Village: ${vilName}
📊 Village Bonus: ${bonuses}

Use *.nvillage all* to see all villages and their bonuses.`,
        rep, "profile");

    } catch (err) {
      console.error("NVILLAGE ERROR:", err);
      return sock.sendMessage(jid, { text: "❌ Village lookup error." }, { quoted: msg });
    }
  }
};
