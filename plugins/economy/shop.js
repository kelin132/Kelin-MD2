import { getUser, saveUser, requireRegistration } from "./database.js";

const shopItems = {
  sword:   { price: 5000,  emoji: "⚔️",  rarity: "common",    xpBonus: 20 },
  shield:  { price: 4000,  emoji: "🛡️",  rarity: "common",    xpBonus: 15 },
  gun:     { price: 8000,  emoji: "🔫",  rarity: "rare",      xpBonus: 40 },
  armor:   { price: 6000,  emoji: "🦾",  rarity: "rare",      xpBonus: 30 },
  potion:  { price: 500,   emoji: "🧪",  rarity: "common",    xpBonus: 5  },
  diamond: { price: 15000, emoji: "💎",  rarity: "legendary", xpBonus: 100 },
  ring:    { price: 3000,  emoji: "💍",  rarity: "common",    xpBonus: 10 },
  scroll:  { price: 2000,  emoji: "📜",  rarity: "common",    xpBonus: 8  },
  axe:     { price: 7000,  emoji: "🪓",  rarity: "rare",      xpBonus: 35 },
  boots:   { price: 3500,  emoji: "👢",  rarity: "common",    xpBonus: 12 },
};

const rarityColors = { common: "⚪", rare: "🔵", legendary: "🟡" };

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
