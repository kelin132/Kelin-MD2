import { getUser, saveUser, requireRegistration, addHistory } from "./database.js";
import { getItemDefinition, getSellPrice } from "./_items.js";
import { formatRyu } from "./currency.js";

function canonical(value) {
  return String(value).trim().toLowerCase().replace(/\s+/g, "_");
}

function label(name) {
  return name.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function summary(sold) {
  return Object.entries(sold)
    .map(([name, quantity]) => `${getItemDefinition(name)?.emoji || "📦"} ${label(name)} ×${quantity}`)
    .join("\n");
}

export default {
  name: "sell",
  aliases: ["sellitem"],
  category: "economy",
  cooldown: 6,
  description: "Sell an inventory item for ryu",
  usage: ".sell <item> | .sell <number> | .sell all",

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;
    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
    const user = await getUser(sender);
    const inventory = Array.isArray(user.inventory) ? user.inventory : [];

    if (!args.length) {
      if (!inventory.length) return reply("❌ Your inventory is empty.");
      const count = new Map();
      for (const item of inventory) count.set(item, (count.get(item) || 0) + 1);
      const lines = [...count.entries()].map(([name, quantity]) => {
        const price = getSellPrice(name);
        return `${getItemDefinition(name)?.emoji || "📦"} *${label(name)}* ×${quantity} → ${
          price ? `${formatRyu(price)} each` : "not sellable"
        }`;
      });
      return reply(`💰 *SELL PRICES*\n\n${lines.join("\n")}\n\nUsage: *.sell <item>* or *.sell all*`);
    }

    const target = canonical(args.join(" "));
    if (target === "all") {
      if (!inventory.length) return reply("❌ Nothing to sell.");
      const sold = {};
      let total = 0;
      user.inventory = inventory.filter((name) => {
        const price = getSellPrice(name);
        if (!price) return true;
        total += price;
        sold[name] = (sold[name] || 0) + 1;
        return false;
      });
      if (!total) return reply("❌ None of your inventory items have a sale value.");
      user.money = (user.money || 0) + total;
      await saveUser(sender, user);
      await addHistory(sender, "sell", total, `Sold all sellable items for ${formatRyu(total)}`);
      return reply(`💰 *SOLD ALL SELLABLE ITEMS*\n\n${summary(sold)}\n\n✅ Received: *${formatRyu(total)}*`);
    }

    let itemName = target;
    if (/^\d+$/.test(target)) {
      const unique = [...new Set(inventory)];
      itemName = unique[Number(target) - 1];
      if (!itemName) return reply("❌ That inventory number does not exist. Check *.inventory*.");
    }
    const price = getSellPrice(itemName);
    if (!price) {
      return reply(`❌ *${label(itemName)}* is not a recognized sellable item.`);
    }
    const index = inventory.indexOf(itemName);
    if (index === -1) return reply(`❌ You don't have *${label(itemName)}* in your inventory.`);

    inventory.splice(index, 1);
    user.inventory = inventory;
    user.money = (user.money || 0) + price;
    await saveUser(sender, user);
    await addHistory(sender, "sell", price, `Sold ${itemName} for ${formatRyu(price)}`);
    return reply(`✅ *Item sold!*\n\n${getItemDefinition(itemName)?.emoji || "📦"} *${label(itemName)}* → *${formatRyu(price)}*\n💰 Wallet: *${formatRyu(user.money)}*`);
  },
};