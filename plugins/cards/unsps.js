import { Col } from "./db.js";

export default {
  name: "unsps",
  aliases: ["unspawned", "cardstats"],
  category: "cards",
  description: "Shows unspawned card counts per tier",
  usage: ".unsps",

  async run({ sock, msg }) {
    const jid   = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      const activeSpawns = global.activeSpawns || {};
      const activeIds    = Object.values(activeSpawns).map(s => s.cardId);

      const results = await Col.cards().aggregate([
        { $match: { cardId: { $nin: activeIds } } },
        { $group: { _id: "$tier", count: { $sum: 1 } } },
      ]).toArray();

      const map = {};
      results.forEach(r => { map[r._id] = r.count; });

      const tiers = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"];
      const EMOJI = { Common: "⚪", Uncommon: "🟢", Rare: "🔵", Epic: "🟣", Legendary: "🟡", Mythic: "🔴" };

      const total = Object.values(map).reduce((a, b) => a + b, 0);

      let text = `🎴 *UNSPAWNED CARDS*\n\n`;
      for (const tier of tiers) {
        const count = map[tier] || 0;
        text += `${EMOJI[tier]} *${tier}:* ${count.toLocaleString()}\n`;
      }
      text += `\n📦 *Total unspawned:* ${total.toLocaleString()}`;

      return reply(text);

    } catch (err) {
      console.error("UNSPS ERROR:", err);
      return reply("❌ Failed to load unspawned card stats.");
    }
  },
};
