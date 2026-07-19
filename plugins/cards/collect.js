import { getActiveDrop, claimDrop, addCardToUser } from "./database.js";

export default {
  name: "collect",
  aliases: ["catch", "grab", "claim"],
  description: "Collect the card that was dropped in this chat",
  category: "cards",
  usage: ".collect",

  async run({ sock, msg, sender }) {
    const chatId = msg.key.remoteJid;

    const active = await getActiveDrop(chatId);
    if (!active) {
      await sock.sendMessage(chatId, {
        text: "❌ There is no card to collect right now!\n\nWait for the next spawn or an admin to *.drop* one.",
      }, { quoted: msg });
      return;
    }

    // Race-safe atomic claim
    const claimed = await claimDrop(chatId, sender);
    if (!claimed) {
      await sock.sendMessage(chatId, {
        text: "💨 Too slow! Someone else just grabbed it.",
      }, { quoted: msg });
      return;
    }

    // Add to winner's collection
    const entry = await addCardToUser(sender, {
      id:     claimed.cardId,
      name:   claimed.cardName,
      tier:   claimed.cardTier,
      series: claimed.cardSeries,
      cdn:    claimed.cardCdn,
      type:   claimed.cardType,
    });

    const tierStars = {
      "Tier S": "⭐⭐⭐⭐⭐ *S*",
      "Tier 1": "⭐⭐⭐⭐",
      "Tier 2": "⭐⭐⭐",
      "Tier 3": "⭐⭐",
      "Tier 4": "⭐",
      "Tier 5": "✦",
      "Tier 6": "✧",
    };

    const tag = `@${sender.split("@")[0].split(":")[0]}`;

    await sock.sendMessage(chatId, {
      text:
`🎉 *${tag} COLLECTED A CARD!*

📛 *Name*   : ${claimed.cardName}
📚 *Series* : ${claimed.cardSeries}
🏆 *Tier*   : ${tierStars[claimed.cardTier] ?? claimed.cardTier}
🆔 *Card ID*: \`${entry._id}\`

_Use .collection to see all your cards!_`,
      mentions: [sender],
    }, { quoted: msg });
  },
};
