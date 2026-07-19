import { fetchRandomCard, fetchCardImage, addCardToUser } from "./database.js";

export default {
  name: "card",
  aliases: ["drawcard", "gacha"],
  description: "Draw a random anime card and add it to your collection",
  category: "cards",
  usage: ".card",

  async run({ sock, msg, sender }) {
    const chatId = msg.key.remoteJid;
    await sock.sendMessage(chatId, { text: "🎴 *Drawing a card…*" }, { quoted: msg });

    const card  = await fetchRandomCard();
    const entry = await addCardToUser(sender, card);

    const tierStars = {
      "Tier S": "⭐⭐⭐⭐⭐ *S*",
      "Tier 1": "⭐⭐⭐⭐",
      "Tier 2": "⭐⭐⭐",
      "Tier 3": "⭐⭐",
      "Tier 4": "⭐",
      "Tier 5": "✦",
      "Tier 6": "✧",
    };

    const caption =
`🎴 *YOU DREW A CARD!*

📛 *Name*   : ${card.name}
📚 *Series* : ${card.series}
🏆 *Tier*   : ${tierStars[card.tier] ?? card.tier}
🆔 *Card ID*: \`${entry._id}\`

_Use .collection to see all your cards_`;

    try {
      const imgBuf = await fetchCardImage(card.cdn);
      if (card.type === "gif") {
        await sock.sendMessage(chatId, {
          video: imgBuf, gifPlayback: true, caption,
        }, { quoted: msg });
      } else {
        await sock.sendMessage(chatId, { image: imgBuf, caption }, { quoted: msg });
      }
    } catch {
      // Fallback: text only if image fetch fails
      await sock.sendMessage(chatId, { text: caption }, { quoted: msg });
    }
  },
};
