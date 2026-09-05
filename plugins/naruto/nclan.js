// plugins/naruto/nclan.js
// View your clan's bonus & ability, or browse the full clan roster — shows clan art

import players from "../../lib/naruto/players.js";
import clans   from "../../lib/naruto/clans.js";
import { sendWithClanImage } from "../../lib/gifHelper.mjs";

function formatBonus(bonus = {}) {
  const labels = { hp: "❤️ HP", chakra: "💙 Chakra", attack: "⚔️ Attack", defense: "🛡️ Defense", speed: "💨 Speed" };
  return Object.entries(bonus)
    .map(([stat, val]) => `${labels[stat] || stat} +${val}`)
    .join("  ") || "—";
}

export default {
  name: "nclan",
  description: "View your clan's bonus & ability, or browse all clans",
  category: "naruto",
  usage: ".nclan [all]",
  aliases: ["nclans"],
  cooldown: 5,

  async run({ sock, msg, sender, text }) {
    const jid = msg.key.remoteJid;

    try {
      // .nclan all — browse the full roster, no profile required
      if (text?.trim().toLowerCase() === "all") {
        const list = clans.map(c =>
          `👁️ *${c.name}*\n   ${formatBonus(c.bonus)}\n   ${c.ability}`
        ).join("\n\n");

        return sock.sendMessage(jid, {
          text: `📜 *NINJA CLAN ROSTER*\n\n${list}\n\nEvery ninja is assigned a clan at *.nstart*.`
        }, { quoted: msg });
      }

      const player = await players.get(sender);

      if (!player) {
        return sock.sendMessage(jid, {
          text: "🥷 You don't have a ninja profile.\n\nUse .nstart first, or try *.nclan all* to browse every clan."
        }, { quoted: msg });
      }

      const clanName = player.clan?.name;
      const clanData = clans.find(c => c.name === clanName) || {};

      return sendWithClanImage(sock, jid, msg,
`👁️ *YOUR CLAN: ${clanName || "Unknown"}*

🌟 Ability: ${clanData.ability || player.clan?.ability || "—"}
📊 Bonus: ${formatBonus(clanData.bonus)}

Use *.nclan all* to browse every clan's bonus & ability.`,
        clanName, "profile");

    } catch (err) {
      console.error("NCLAN ERROR:", err);
      return sock.sendMessage(jid, { text: "❌ Clan lookup error." }, { quoted: msg });
    }
  }
};
