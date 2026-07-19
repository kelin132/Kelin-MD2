import { getUserCards } from "./database.js";

export default {
  name: "collection",
  aliases: ["mycards", "cards"],
  description: "View your card collection (or mention someone to see theirs)",
  category: "cards",
  usage: ".collection [@mention] [page]",

  async run({ sock, msg, args, sender }) {
    const chatId = msg.key.remoteJid;

    // Resolve target: mentioned user or self
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    let target = mentioned ?? sender;

    // Page number: last arg if digit
    let page = 1;
    const lastArg = args[args.length - 1];
    if (lastArg && /^\d+$/.test(lastArg)) page = parseInt(lastArg, 10);

    const { cards, total } = await getUserCards(target, page, 10);
    const pages = Math.max(1, Math.ceil(total / 10));
    const tag   = `@${target.split("@")[0].split(":")[0]}`;

    if (!cards.length) {
      await sock.sendMessage(chatId, {
        text: target === sender
          ? `❌ You don't have any cards yet!\n\nUse *.card* to draw your first one.`
          : `❌ ${tag} doesn't have any cards yet.`,
        mentions: [target],
      }, { quoted: msg });
      return;
    }

    const tierEmoji = (t) => ({ "Tier S": "🌟", "Tier 1": "💎", "Tier 2": "🔵", "Tier 3": "🟢", "Tier 4": "🟡", "Tier 5": "🟠", "Tier 6": "🔴" })[t] ?? "⚪";

    const lines = cards.map((c, i) =>
      `${i + 1 + (page - 1) * 10}. ${tierEmoji(c.cardTier)} *${c.cardName}* — _${c.cardSeries}_ *(${c.cardTier})*\n   🆔 \`${c._id}\``
    );

    const text =
`🗂 *${tag}'s COLLECTION*

${lines.join("\n\n")}

📦 Total: ${total} card${total !== 1 ? "s" : ""} · Page ${page}/${pages}
_Use .collection [page] to browse · .trade to swap cards_`;

    await sock.sendMessage(chatId, { text, mentions: [target] }, { quoted: msg });
  },
};
