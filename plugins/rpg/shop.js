import { getRpgUser } from "./db.js";

const SHOP_ITEMS = [
  { id: "iron_sword", name: "Iron Sword", price: 500, atk: 10, type: "weapon", emoji: "🗡️" },
  { id: "steel_blade", name: "Steel Blade", price: 2000, atk: 25, type: "weapon", emoji: "⚔️" },
  { id: "mythril_wand", name: "Mythril Wand", price: 5000, atk: 60, type: "weapon", emoji: "🪄" },
  { id: "leather_armor", name: "Leather Armor", price: 400, def: 5, type: "armor", emoji: "🧥" },
  { id: "plate_mail", name: "Plate Mail", price: 1500, def: 15, type: "armor", emoji: "🛡️" },
  { id: "dragon_scale", name: "Dragon Scale", price: 6000, def: 40, type: "armor", emoji: "🐲" },
];

export default {
  name: "rpg-shop",
  aliases: ["rshop"],
  category: "rpg",
  description: "Buy gear for your RPG character",
  usage: ".rpg-shop [item_id]",

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      const user = await getRpgUser(sender);
      if (!user) return reply("❌ You haven't started your RPG journey yet!\nUse *.rpg-start* to begin.");

      const itemId = args[0];
      if (!itemId) {
        let text = "🏪 *RPG GEAR SHOP* 🏪\n\n";
        text += `💰 Your Gold: *${user.gold.toLocaleString()}*\n\n`;
        
        for (const item of SHOP_ITEMS) {
          text += `${item.emoji} *${item.name}*\n`;
          text += `   Price: ${item.price} Gold\n`;
          text += `   Effect: +${item.atk || item.def} ${item.type === "weapon" ? "ATK" : "DEF"}\n`;
          text += `   ID: \`.rpg-shop ${item.id}\`\n\n`;
        }
        return reply(text);
      }

      const item = SHOP_ITEMS.find(i => i.id === itemId);
      if (!item) return reply("❌ Item not found in shop.");

      if (user.gold < item.price) {
        return reply(`❌ You don't have enough gold! You need *${item.price - user.gold}* more.`);
      }

      user.gold -= item.price;
      
      // Auto-equip logic
      if (item.type === "weapon") {
        const oldAtk = user.equipment.weapon ? SHOP_ITEMS.find(i => i.name === user.equipment.weapon)?.atk || 0 : 0;
        user.atk = (user.atk - oldAtk) + item.atk;
        user.equipment.weapon = item.name;
      } else {
        const oldDef = user.equipment.armor ? SHOP_ITEMS.find(i => i.name === user.equipment.armor)?.def || 0 : 0;
        user.def = (user.def - oldDef) + item.def;
        user.equipment.armor = item.name;
      }

      await user.save();
      return reply(`🛍️ *PURCHASED!* 🛍️\n\nYou bought and equipped *${item.name}*!\nStats updated.`);

    } catch (err) {
      console.error("RPG SHOP ERROR:", err);
      return reply("❌ Failed to access shop.");
    }
  },
};
