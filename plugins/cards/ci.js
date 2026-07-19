import { getCard, searchCards, TIER_EMOJI } from "../../lib/cardApi.mjs";

export default {
  name: "cardinfo",
  aliases: ["cinfo", "ci"],
  category: "cards",
  description: "Get detailed info about a card",
  usage: ".cardinfo <name or ID>",

  async run({ sock, msg, args }) {
    const jid   = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      const input = args.join(" ").trim();
      if (!input) return reply("❌ Usage: .cardinfo <card name or ID>");

      const card = await getCard(input);

      if (!card) {
        const similar = await searchCards(input, 5);
        if (similar.length) {
          let suggest = `❌ Card not found.\n\nDid you mean:\n\n`;
          similar.forEach((c, i) => { suggest += `${i + 1}. ${c.name} — ${c.cardId}\n`; });
          return reply(suggest);
        }
        return reply(`❌ No card found matching "${input}".`);
      }

      const emoji = TIER_EMOJI[card.tier] || "⭐";

      const text =
`📋 *CARD INFO*

🃏 *${card.name}*
${emoji} Tier: *${card.tier}*
📺 Series: ${card.series}
💰 Value: $${card.price.toLocaleString()}
🆔 ID: \`${card.cardId}\``;

      if (card.media) {
        return sock.sendMessage(jid, {
          image:   { url: card.media },
          caption: text,
        }, { quoted: msg });
      }

      return reply(text);

    } catch (err) {
      console.error("CI ERROR:", err);
      return reply("❌ Command failed.");
    }
  },
};
