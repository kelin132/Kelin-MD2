import { getUser, requireRegistration } from "./database.js";
import { getItemDefinition, getSellPrice } from "./_items.js";
import { formatRyu } from "./currency.js";

function label(name) {
  return name.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default {
  name: "inventory",
  description: "Check your inventory and item sale values",
  category: "economy",
  usage: ".inventory",
  aliases: ["inv", "items"],
  cooldown: 6,

  async run({ sock, msg, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const user = await getUser(sender);
    const inventory = Array.isArray(user.inventory) ? user.inventory : [];
    if (!inventory.length) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "🎒 *Inventory*\n\nYour bag is empty.\nUse *.shop* or *.dig* and *.fish* to get items.",
      }, { quoted: msg });
    }

    const count = new Map();
    for (const item of inventory) count.set(item, (count.get(item) || 0) + 1);
    const lines = [...count.entries()].map(([name, quantity], index) => {
      const definition = getItemDefinition(name);
      const price = getSellPrice(name);
      const value = price ? `💰 ${formatRyu(price)} each` : "🚫 not sellable";
      return `${index + 1}. ${definition?.emoji || "📦"} *${label(name)}* ×${quantity}\n   ${value}`;
    });

    return sock.sendMessage(msg.key.remoteJid, {
      text: [
        `🎒 *Inventory — ${user.name || "User"}*`,
        "",
        ...lines,
        "",
        `📦 Total items: *${inventory.length}*`,
        "💰 Sell one with *.sell <item>* or all sellable items with *.sell all*.",
      ].join("\n"),
    }, { quoted: msg });
  },
};