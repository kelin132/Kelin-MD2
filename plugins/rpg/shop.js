import { addInventoryItem, getRpgUser, saveRpgUser } from "./db.js";

export const SHOP_ITEMS = [
  { id: "iron_sword", name: "Iron Sword", price: 500, atk: 10, type: "weapon", emoji: "🗡️" },
  { id: "steel_blade", name: "Steel Blade", price: 2000, atk: 25, type: "weapon", emoji: "⚔️" },
  { id: "mythril_wand", name: "Mythril Wand", price: 5000, atk: 60, type: "weapon", emoji: "🪄" },
  { id: "leather_armor", name: "Leather Armor", price: 400, def: 5, type: "armor", emoji: "🧥" },
  { id: "plate_mail", name: "Plate Mail", price: 1500, def: 15, type: "armor", emoji: "🛡️" },
  { id: "dragon_scale", name: "Dragon Scale", price: 6000, def: 40, type: "armor", emoji: "🐲" },
  { id: "small_potion", name: "Small Potion", price: 80, type: "consumable", heal: 35, emoji: "🧪" },
  { id: "mega_potion", name: "Mega Potion", price: 250, type: "consumable", heal: "full", emoji: "❤️‍🩹" },
  { id: "chakra_elixir", name: "Chakra Elixir", price: 180, type: "consumable", chakra: "full", emoji: "🔷" },
  { id: "lucky_charm", name: "Lucky Charm", price: 1000, type: "consumable", luck: 3600000, emoji: "🍀" },
];

export default {
  name: "rpg-shop",
  aliases: ["rshop", "rpgstore", "rpgbuy"],
  category: "rpg",
  description: "Buy gear for your RPG character",
  usage: ".rpg-shop [buy <item_id>]",

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      const user = await getRpgUser(sender);
      if (!user) return reply("❌ You haven't started your RPG journey yet!\nUse *.rpg-start* to begin.");

    const action = (args[0] || "").toLowerCase();
    const itemId = action === "buy" ? args[1]?.toLowerCase() : action;
      if (!itemId) {
        let text = "🏪 *RPG ADVENTURE SHOP* 🏪\n\n";
        text += `💰 Your Gold: *${user.gold.toLocaleString()}*\n\n`;
        
        for (const item of SHOP_ITEMS) {
          text += `${item.emoji} *${item.name}*\n`;
          text += `   Price: ${item.price} Gold\n`;
          const effect = item.atk
            ? `+${item.atk} ATK`
            : item.def
              ? `+${item.def} DEF`
              : item.heal === "full"
                ? "Restore full HP"
                : item.chakra === "full"
                  ? "Restore full Chakra"
                  : item.luck
                    ? "Improve hunt luck for 1 hour"
                    : `Restore ${item.heal} HP`;
          text += `   Effect: ${effect}\n`;
          text += `   Buy: \`.rpg-shop buy ${item.id}\`\n\n`;
        }
        return reply(text);
      }

      const item = SHOP_ITEMS.find(i => i.id === itemId);
      if (!item) return reply("❌ Item not found in shop.");

      if (user.gold < item.price) {
        return reply(`❌ You don't have enough gold! You need *${item.price - user.gold}* more.`);
      }

      user.gold -= item.price;
      
      if (item.type === "weapon") {
        const oldWeapon = SHOP_ITEMS.find((i) => i.id === user.equipment.weapon || i.name === user.equipment.weapon);
        const oldAtk = oldWeapon?.atk || 0;
        user.atk = (user.atk - oldAtk) + item.atk;
        user.equipment.weapon = item.id;
      } else if (item.type === "armor") {
        const oldArmor = SHOP_ITEMS.find((i) => i.id === user.equipment.armor || i.name === user.equipment.armor);
        const oldDef = oldArmor?.def || 0;
        user.def = (user.def - oldDef) + item.def;
        user.equipment.armor = item.id;
      } else {
        addInventoryItem(user, item.id);
      }

      await saveRpgUser(sender, user);
      return reply(item.type === "consumable"
        ? `🛍️ *PURCHASED!* 🛍️\n\nYou bought *${item.name}*.\nUse \`.rpg-use ${item.id}\` when you need it.`
        : `🛍️ *PURCHASED!* 🛍️\n\nYou bought and equipped *${item.name}*!\nStats updated.`);

    } catch (err) {
      console.error("RPG SHOP ERROR:", err);
      return reply("❌ Failed to access shop.");
    }
  },
};
