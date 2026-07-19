import { Col } from "./db.js";

export default {
  name: "vs",
  aliases: ["mylistings", "mymarket"],
  category: "cards",
  description: "View your cards listed for sale in the marketplace",
  usage: ".vs",

  async run({ sock, msg, sender }) {
    const jid   = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      const userId = sender.split("@")[0];
      const cards  = await Col.market().find({ sellerId: userId }).toArray();

      if (!cards.length) return reply("📭 You haven't listed any cards for sale.\n\nUse .sellc <index> <price> to list one.");

      let text = "📋 *YOUR LISTED CARDS*\n\n";
      cards.forEach((c, i) => {
        text += `${i + 1}. *${c.cardName}* [${c.cardRarity}]\n💰 Price: $${Number(c.price).toLocaleString()}\n\n`;
      });
      text += "Use *.rc <index>* to remove a listing.";

      return reply(text);

    } catch (err) {
      console.error("VS ERROR:", err);
      return reply("❌ Failed to fetch your listings.");
    }
  },
};
