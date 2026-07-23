import { getUser, requireRegistration } from "./database.js";

export default {
  name: "inventory",
  description: "Check your inventory",
  category: "economy",
  usage: ".inventory",
  aliases: ["inv", "items"],

  async run({ sock, msg, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const user = await getUser(sender);
    const inv  = user.inventory || [];

    if (inv.length === 0) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `🎒 *Your Inventory is Empty!*\n\nBuy items with *.shop buy <item>*`
      }, { quoted: msg });
    }

    const count = {};
    inv.forEach(item => { count[item] = (count[item] || 0) + 1; });

    const list = Object.entries(count)
      .map(([item, qty]) => `• ${item} x${qty}`)
      .join("\n");

    await sock.sendMessage(msg.key.remoteJid, {
      text: `🎒 *YOUR INVENTORY*\n\n${list}\n\n📊 Total Items: ${inv.length}`
    }, { quoted: msg });
  }
};
