import { fetchRandomCard, fetchCardImage, createDrop } from "./database.js";

export default {
  name: "drop",
  aliases: ["carddrop", "dropacard"],
  description: "Manually drop a card in the chat for anyone to collect (admin)",
  category: "cards",
  usage: ".drop",
  isAdmin: true,

  async run({ sock, msg, sender }) {
    const chatId = msg.key.remoteJid;

    if (!chatId.endsWith("@g.us")) {
      await sock.sendMessage(chatId, { text: "❌ Card drops only work in groups." }, { quoted: msg });
      return;
    }

    let drop;
    try {
      const card = await fetchRandomCard();
      drop = await createDrop(chatId, card, sender);
    } catch (err) {
      if (err.message === "ALREADY_ACTIVE") {
        await sock.sendMessage(chatId, {
          text: "⚠️ There is already an unclaimed card in this chat!\nUse *.collect* to grab it.",
        }, { quoted: msg });
        return;
      }
      throw err;
    }

    const caption = buildDropCaption(drop);

    try {
      const imgBuf = await fetchCardImage(drop.cardCdn);
      if (drop.cardType === "gif") {
        await sock.sendMessage(chatId, { video: imgBuf, gifPlayback: true, caption });
      } else {
        await sock.sendMessage(chatId, { image: imgBuf, caption });
      }
    } catch {
      await sock.sendMessage(chatId, { text: caption });
    }
  },
};

export function buildDropCaption(drop) {
  const tierStars = {
    "Tier S": "⭐⭐⭐⭐⭐ *S*",
    "Tier 1": "⭐⭐⭐⭐",
    "Tier 2": "⭐⭐⭐",
    "Tier 3": "⭐⭐",
    "Tier 4": "⭐",
    "Tier 5": "✦",
    "Tier 6": "✧",
  };
  return `🃏 *A CARD HAS APPEARED!*

📛 *Name*   : ${drop.cardName}
📚 *Series* : ${drop.cardSeries}
🏆 *Tier*   : ${tierStars[drop.cardTier] ?? drop.cardTier}

⚡ *Type \`.collect\` to claim this card!*
🕐 First one to grab it wins!`;
}
