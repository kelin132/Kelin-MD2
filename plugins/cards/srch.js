import { Col } from "./db.js";

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default {
  name: "search",
  aliases: ["cardfind", "csearch"],
  category: "cards",
  description: "Search a card by name or ID and preview it",
  usage: ".search <name or ID>",

  async run({ sock, msg, args, text: rawText }) {
    const jid   = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      const query = rawText.trim();
      if (!query) return reply("❌ Give a card name or ID.\nExample: .search rimuru");

      let card = await Col.cards().findOne({ cardId: query.toUpperCase() });

      if (!card) {
        card = await Col.cards().findOne({ name: { $regex: new RegExp(escapeRegex(query), "i") } });
      }

      if (!card) {
        const similar = await Col.cards().find({
          name: { $regex: new RegExp(escapeRegex(query), "i") },
        }).limit(5).toArray();

        if (similar.length) {
          let suggest = "❌ Card not found.\n\nDid you mean:\n\n";
          similar.forEach((c, i) => { suggest += `${i + 1}. ${c.name} (${c.cardId})\n`; });
          return reply(suggest);
        }
        return reply("❌ Card not found.");
      }

      const text =
`ㅤㅤ∘]───❀───[∘
*∘₊✧ CARD INFO* ❀
     ∘]───❀───[∘

𝗡𝗮𝗺𝗲: ${card.name}
𝗧𝗶𝗲𝗿: ${card.tier}
𝗣𝗿𝗶𝗰𝗲: $${Number(card.price || 0).toLocaleString()}
𝗜𝗗: ${card.cardId}
𝗦𝗲𝗿𝗶𝗲𝘀: ${card.series || "Unknown"}

  *❀────⋆⋅∘⋅⋆────❀*
 *CARD PREVIEW*
  *❀────⋆⋅∘⋅⋆────❀*
      ∘──────∘`;

      if (card.media) {
        try {
          if (card.mediaType === "video") {
            return await sock.sendMessage(jid, {
              video: { url: card.media }, gifPlayback: true, caption: text,
            }, { quoted: msg });
          }
          return await sock.sendMessage(jid, { image: { url: card.media }, caption: text }, { quoted: msg });
        } catch { /* fall through */ }
      }

      return reply(text);

    } catch (err) {
      console.error("SEARCH ERROR:", err);
      return reply("❌ Search failed.");
    }
  },
};
