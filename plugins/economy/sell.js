import { getUser, saveUser, requireRegistration, addHistory } from "./database.js";
import { SHOP_ITEMS } from "./_items.js";

export default {
  name: "sell",
  aliases: ["sellitem"],
  category: "economy",
  description: "Sell an item from your inventory for cash",
  usage: ".sell <item>  |  .sell all",

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });

    const user = await getUser(sender);
    const inv  = user.inventory || [];

    if (!args[0]) {
      if (!inv.length) return reply("❌ Your inventory is empty.");

      const count = {};
      inv.forEach(i => { count[i] = (count[i] || 0) + 1; });

      let text = "💰 *SELL PRICES*\n\n";
      for (const [item, qty] of Object.entries(count)) {
        const def = SHOP_ITEMS[item];
        if (!def) continue;
        const price = Math.floor(def.price * def.sellPct);
        text += `${def.emoji} *${item}* x${qty} → $${price.toLocaleString()} each\n`;
      }
      text += "\nUsage: *.sell <item>* or *.sell all*";
      return reply(text);
    }

    const target = args[0].toLowerCase();

    if (target === "all") {
      if (!inv.length) return reply("❌ Nothing to sell.");

      let total = 0;
      const sold = {};
      user.inventory = inv.filter(item => {
        const def = SHOP_ITEMS[item];
        if (!def) return true; // keep unknown items
        const price = Math.floor(def.price * def.sellPct);
        total += price;
        sold[item] = (sold[item] || 0) + 1;
        return false;
      });

      user.money = (user.money || 0) + total;
      await saveUser(sender, user);
      await addHistory(sender, "sell", total, `Sold all items for $${total.toLocaleString()}`);

      let text = "💰 *SOLD ALL ITEMS*\n\n";
      for (const [item, qty] of Object.entries(sold)) {
        const def = SHOP_ITEMS[item];
        text += `${def?.emoji || "📦"} ${item} x${qty}\n`;
      }
      text += `\n💵 Total Received: $${total.toLocaleString()}`;
      return reply(text);
    }

    const def = SHOP_ITEMS[target];
    if (!def) return reply(`❌ Unknown item: *${target}*`);

    const idx = inv.indexOf(target);
    if (idx === -1) return reply(`❌ You don't have *${target}* in your inventory.`);

    const price = Math.floor(def.price * def.sellPct);
    inv.splice(idx, 1);
    user.inventory = inv;
    user.money     = (user.money || 0) + price;

    await saveUser(sender, user);
    await addHistory(sender, "sell", price, `Sold ${target} for $${price.toLocaleString()}`);

    return reply(
`✅ *Item Sold!*

${def.emoji} *${target}* → $${price.toLocaleString()}
💵 Balance : $${user.money.toLocaleString()}`
    );
  },
};
