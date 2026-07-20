import { getUser, saveUser, requireRegistration } from "./database.js";
import { SHOP_ITEMS as shopItems, RARITY_COLORS as rarityColors } from "./_items.js";

export default {
  name: "shop",
  description: "Buy items from the shop",
  category: "economy",
  usage: ".shop [buy] [item]",

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    if (!args[0] || args[0] === "list") {
      const list = Object.entries(shopItems)
        .map(([n, i]) => `${i.emoji} *${n}* — $${i.price.toLocaleString()} ${rarityColors[i.rarity]} ${i.rarity}`)
        .join("\n");
      return sock.sendMessage(msg.key.remoteJid, {
        text: `🛍️ *KELIN MD SHOP*\n\n${list}\n\n📝 Buy: *.shop buy <item>*`
      }, { quoted: msg });
    }

    if (args[0] === "buy") {
      if (!args[1]) {
        return sock.sendMessage(msg.key.remoteJid, {
          text: `❌ Usage: *.shop buy <item_name>*`
        }, { quoted: msg });
      }
      const itemName = args[1].toLowerCase();
      const item     = shopItems[itemName];

      if (!item) {
        return sock.sendMessage(msg.key.remoteJid, {
          text: `❌ Item not found! Use *.shop list* to see all items.`
        }, { quoted: msg });
      }

      const user = await getUser(sender);
      if (user.money < item.price) {
        return sock.sendMessage(msg.key.remoteJid, {
          text: `💸 *Insufficient Funds!*\n\nNeed : $${item.price.toLocaleString()}\nHave : $${user.money.toLocaleString()}\nShort: $${(item.price - user.money).toLocaleString()}`
        }, { quoted: msg });
      }

      user.money -= item.price;
      user.xp     = (user.xp || 0) + item.xpBonus;
      user.inventory = user.inventory || [];
      user.inventory.push(itemName);
      await saveUser(sender, user);

      return sock.sendMessage(msg.key.remoteJid, {
        text: `✅ *Purchase Successful!*\n\n${item.emoji} Bought   : ${itemName}\n🔮 XP Bonus : +${item.xpBonus}\n💰 Paid     : $${item.price.toLocaleString()}\n💵 Balance  : $${user.money.toLocaleString()}`
      }, { quoted: msg });
    }

    await sock.sendMessage(msg.key.remoteJid, {
      text: "❌ Invalid command!\n\nUse *.shop list* or *.shop buy <item>*"
    }, { quoted: msg });
  }
};
