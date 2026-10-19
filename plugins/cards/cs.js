import { fetchAllCards, TIER_EMOJI } from "../../lib/cardApi.mjs";

export function findCardsBySeries(cards, query) {
  const needle = String(query || "").trim().toLocaleLowerCase();
  if (!needle) return [];
  return cards.filter((card) => String(card.series || "").trim().toLocaleLowerCase().includes(needle));
}

export default {
  name: "cs",
  aliases: ["seriescards", "cardseries"],
  category: "cards",
  description: "Find cards by series",
  usage: ".cs <series> [page]",
  cooldown: 5,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
    const parts = [...(args || [])];
    let page = 1;
    if (parts.length > 1 && /^\d+$/.test(String(parts.at(-1)))) {
      page = Math.max(1, Number(parts.pop()));
    }
    const query = parts.join(" ").trim();
    if (!query) return reply("❌ Usage: *.cs <series> [page]*\nExample: *.cs Naruto*");

    try {
      const cards = findCardsBySeries(await fetchAllCards(), query);
      if (!cards.length) return reply(`❌ No cards found for the series *${query}*.`);

      const pageSize = 10;
      const totalPages = Math.ceil(cards.length / pageSize);
      page = Math.min(page, totalPages);
      const results = cards.slice((page - 1) * pageSize, page * pageSize);
      const lines = results.map((card) => {
        const emoji = TIER_EMOJI[card.tier] || "⭐";
        return `• ${emoji} *${card.name}* — ${card.tier || "Unknown"} · ID \`${card.cardId}\``;
      });
      return reply(
        `📚 *Cards by series: ${query}*\n` +
        `Showing ${results.length} of ${cards.length} · Page ${page}/${totalPages}\n\n` +
        lines.join("\n") +
        (page < totalPages ? `\n\nNext page: *.cs ${query} ${page + 1}*` : ""),
      );
    } catch (error) {
      console.error("[cs] Card series search failed:", error?.message || error);
      return reply("❌ Card search is temporarily unavailable. Please try again.");
    }
  },
};
