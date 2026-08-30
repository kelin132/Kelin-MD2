import players from "../../lib/player.js";
import items from "../../lib/items.js";

function findItem(input) {
  const value = String(input || "").trim().toLowerCase();
  return items.find((item) => item.id.toLowerCase() === value)
    || items[Number.parseInt(value, 10) - 1];
}

export default {
  name: "nshop",
  aliases: ["ninjashop", "nstore"],
  description: "Buy Naruto items with ryo",
  category: "naruto",
  usage: ".nshop [number or item id]",

  async run({ sock, msg, text, sender }) {
    const jid = msg.key.remoteJid;
    const player = await players.get(sender);
    if (!player) {
      return sock.sendMessage(jid, { text: "🍃 Use *.nstart* before visiting the shop." }, { quoted: msg });
    }

    const input = String(text || "").trim();
    if (!input) {
      const lines = items.slice(0, 30).map((item, index) => `${index + 1}. *${item.name}* — 💰 ${item.price} — \`${item.id}\``);
      lines.push("", "Buy with `.nshop <number or item id>`.");
      return sock.sendMessage(jid, { text: `🛒 *NINJA SUPPLY SHOP*\n💰 Your ryo: ${player.ryo}\n\n${lines.join("\n")}` }, { quoted: msg });
    }

    const item = findItem(input);
    if (!item) {
      return sock.sendMessage(jid, { text: "❌ Item not found. Use *.nshop* to see the catalogue." }, { quoted: msg });
    }
    if ((player.ryo || 0) < item.price) {
      return sock.sendMessage(jid, { text: `❌ *${item.name}* costs ${item.price} ryo, but you have ${player.ryo || 0}.` }, { quoted: msg });
    }

    await players.update(sender, {
      $inc: { ryo: -item.price },
      $push: { inventory: item.id },
      $set: { updatedAt: Date.now() },
    });
    const updated = await players.get(sender);
    return sock.sendMessage(jid, {
      text: `✅ Bought *${item.name}* for ${item.price} ryo.\n💰 Remaining: ${updated.ryo}`,
    }, { quoted: msg });
  },
};