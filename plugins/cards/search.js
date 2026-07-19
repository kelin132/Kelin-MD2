import { searchCardsApi } from "./database.js";

export default {
  name: "cardsearch",
  aliases: ["searchcard", "csearch"],
  description: "Search anime cards by name or series",
  category: "cards",
  usage: ".cardsearch <name>  |  .cardsearch <name> <page>",

  async run({ sock, msg, args }) {
    const chatId = msg.key.remoteJid;
    if (!args.length) {
      await sock.sendMessage(chatId, {
        text: "❌ Usage: *.cardsearch <name or series>*\nExample: *.cardsearch Naruto*",
      }, { quoted: msg });
      return;
    }

    // Last arg is a page number if it's a digit
    let page  = 1;
    let terms = [...args];
    if (/^\d+$/.test(terms[terms.length - 1])) {
      page  = parseInt(terms.pop(), 10);
    }
    const query = terms.join(" ");

    await sock.sendMessage(chatId, { text: `🔍 Searching for *${query}*…` }, { quoted: msg });

    const { cards, pagination } = await searchCardsApi(query, page, 10);

    if (!cards.length) {
      await sock.sendMessage(chatId, {
        text: `❌ No cards found for *${query}*`,
      }, { quoted: msg });
      return;
    }

    const tierEmoji = (t) => ({ "Tier S": "🌟", "Tier 1": "💎", "Tier 2": "🔵", "Tier 3": "🟢", "Tier 4": "🟡", "Tier 5": "🟠", "Tier 6": "🔴" })[t] ?? "⚪";

    const lines = cards.map((c, i) =>
      `${i + 1 + (page - 1) * 10}. ${tierEmoji(c.tier)} *${c.name}* — ${c.series} _(${c.tier})_`
    );

    const text =
`🔍 *CARD SEARCH: ${query.toUpperCase()}*

${lines.join("\n")}

📄 Page ${pagination.page} of ${pagination.pages} (${pagination.total} total)
_Use .cardsearch ${query} <page> for more_`;

    await sock.sendMessage(chatId, { text }, { quoted: msg });
  },
};
