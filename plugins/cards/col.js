import { findOrCreateUser } from "./db.js";

const TIER_MAP = {
  Common: "1", Uncommon: "2", Rare: "3",
  Epic: "4", Legendary: "5", Mythic: "S",
};

export default {
  name: "col",
  aliases: ["mycol", "mycards"],
  category: "cards",
  description: "View your card collection",
  usage: ".col",

  async run({ sock, msg, sender }) {
    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      const user = await findOrCreateUser(sender);

      if (!Array.isArray(user.cards) || user.cards.length === 0) {
        return reply("❌ You don't have any cards yet. Wait for a spawn or use .claim!");
      }

      const ReadMore = "\u200e".repeat(4000);

      let text =
`🃏 *Your Card Collection*

${ReadMore}
👤 @${sender.split("@")[0]}
📦 Total: ${user.cards.length}

`;

      user.cards.forEach((card, i) => {
        const tier = TIER_MAP[card.tier] || "?";
        text += `${i + 1}. 🃏 *${card.name}* (Tier: ${tier})\n`;
      });

      return await sock.sendMessage(jid, {
        text,
        mentions: [sender],
      }, { quoted: msg });

    } catch (err) {
      console.error("COL ERROR:", err);
      return reply("❌ Failed to load your collection.");
    }
  },
};
