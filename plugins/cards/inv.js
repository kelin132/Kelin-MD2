import { browseCardsApi } from "./database.js";

export default {
  name: "inv",
  aliases: ["cardinv", "cardlib", "library"],
  description: "Browse the full anime card library",
  category: "cards",
  usage: ".inv [page]",

  async run({ sock, msg, args }) {
    const chatId = msg.key.remoteJid;
    const page   = args[0] && /^\d+$/.test(args[0]) ? parseInt(args[0], 10) : 1;

    await sock.sendMessage(chatId, { text: `📚 Loading card library page ${page}…` }, { quoted: msg });

    const { cards, pagination } = await browseCardsApi(page, 10);

    if (!cards.length) {
      await sock.sendMessage(chatId, { text: "❌ No cards found on this page." }, { quoted: msg });
      return;
    }

    const tierEmoji = (t) => ({ "Tier S": "🌟", "Tier 1": "💎", "Tier 2": "🔵", "Tier 3": "🟢", "Tier 4": "🟡", "Tier 5": "🟠", "Tier 6": "🔴" })[t] ?? "⚪";

    const lines = cards.map((c, i) =>
      `${i + 1 + (page - 1) * 10}. ${tierEmoji(c.tier)} *${c.name}*\n   📚 ${c.series} · ${c.tier}`
    );

    const text =
`📚 *CARD LIBRARY*

${lines.join("\n\n")}

📄 Page ${pagination.page} of ${pagination.pages} (${pagination.total.toLocaleString()} total cards)
_Use .inv <page> to browse · .card to draw one_`;

    await sock.sendMessage(chatId, { text }, { quoted: msg });
  },
};
