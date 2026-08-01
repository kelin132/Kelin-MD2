import { getUser, saveUser, requireRegistration } from "./database.js";
import { SHOP_ITEMS as shopItems, RARITY_COLORS as rarityColors, SHOP_CATEGORIES } from "./_items.js";

export default {
  name: "shop",
  description: "Browse and buy items from the shop",
  category: "economy",
  cooldown: 6,
  usage: ".shop [category] | .shop buy <number>",

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });

    const sub = (args[0] || "").toLowerCase();

    // ── BUY ───────────────────────────────────────────────────────────────────
    if (sub === "buy") {
      const itemNumber = Number(args[1]);
      const orderedItems = Object.entries(shopItems);
      const selected = Number.isInteger(itemNumber) && itemNumber >= 1
        ? orderedItems[itemNumber - 1]
        : null;

      if (!selected) {
        return reply("❌ Choose a valid item number.\n\nUse *.shop <category>* to see numbered items.\nExample: *.shop buy 1*");
      }

      const [itemName, item] = selected;
      const user = await getUser(sender);
      if (user.money < item.price) {
        return reply(
`💸 *Insufficient Funds!*

${item.emoji} ${itemName}
Need : $${item.price.toLocaleString()}
Have : $${user.money.toLocaleString()}
Short: $${(item.price - user.money).toLocaleString()}`
        );
      }

      user.money -= item.price;
      user.xp     = (user.xp || 0) + item.xpBonus;
      user.inventory = user.inventory || [];
      user.inventory.push(itemName);
      await saveUser(sender, user);

      return reply(
`✅ *Purchase Successful!*

${item.emoji} Bought   : ${itemName}
🔮 XP Bonus : +${item.xpBonus}
💰 Paid     : $${item.price.toLocaleString()}
💵 Balance  : $${user.money.toLocaleString()}`
      );
    }

    // ── CATEGORY BROWSE ───────────────────────────────────────────────────────
    const catKeys = Object.keys(SHOP_CATEGORIES);
    const catAlias = {
      weapon: "gear", weapons: "gear", items: "gear",
      clothing: "clothes", fashion: "clothes",
      car: "cars", vehicle: "cars", vehicles: "cars",
      jet: "jets", plane: "jets", planes: "jets",
      house: "realestate", houses: "realestate", mansion: "realestate",
      mansions: "realestate", property: "realestate", real: "realestate",
    };
    const catKey = catAlias[sub] || (catKeys.includes(sub) ? sub : null);

    if (catKey) {
      const cat   = SHOP_CATEGORIES[catKey];
      const items = Object.entries(shopItems).filter(([, i]) => i.category === catKey);

      const list = items.map(([name, i]) =>
        `${Object.keys(shopItems).indexOf(name) + 1}. ${i.emoji} *${name}* — $${i.price.toLocaleString()} ${rarityColors[i.rarity]} ${i.rarity}`
      ).join("\n");

      return reply(
`${cat.emoji} *${cat.label.toUpperCase()}*

${list}

📝 Buy: *.shop buy <number>*`
      );
    }

    // ── MAIN MENU (show all categories) ──────────────────────────────────────
    if (!sub || sub === "list" || sub === "menu") {
      const catList = Object.entries(SHOP_CATEGORIES).map(([key, cat]) => {
        const count = Object.values(shopItems).filter(i => i.category === key).length;
        return `${cat.emoji} *.shop ${key}* — ${cat.label} (${count} items)`;
      }).join("\n");

      return reply(
`🛍️ *AKIRA MD SHOP*

Browse by category:
${catList}

💡 Use *.shop <category>* to see items
💳 Use *.shop buy <number>* to purchase`
      );
    }

    return reply("❌ Invalid command!\n\nUse *.shop* to see categories or *.shop buy <number>*");
  }
};
