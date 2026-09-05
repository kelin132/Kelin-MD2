import { countInventoryItem, getRpgUser, removeInventoryItem, saveRpgUser } from "./db.js";
import { SHOP_ITEMS } from "./shop.js";

export default {
  name: "rpg-use",
  aliases: ["rpguse", "ruse", "rpgitem"],
  category: "rpg",
  description: "Use an RPG consumable item",
  usage: ".rpg-use <item_id>",
  cooldown: 3,

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
    const user = await getRpgUser(sender);
    if (!user) return reply("❌ Start your RPG journey with *.rpg-start warrior* first.");

    const itemId = (args?.[0] || "").toLowerCase();
    const item = SHOP_ITEMS.find((entry) => entry.id === itemId && entry.type === "consumable");
    if (!item) return reply("❌ Choose a consumable from your bag.\nUse *.rpg-inventory* to see your items.");
    if (!countInventoryItem(user, item.id)) {
      return reply(`❌ You do not have a *${item.name}*.\nBuy one with *.rpg-shop buy ${item.id}*.`);
    }

    removeInventoryItem(user, item.id);
    let effect = "Item effect applied.";
    if (item.heal) {
      const before = user.hp;
      user.hp = item.heal === "full" ? user.maxHp : Math.min(user.maxHp, user.hp + item.heal);
      effect = `❤️ HP restored: ${before} → ${user.hp}/${user.maxHp}`;
    } else if (item.chakra) {
      const before = user.chakra || 0;
      user.chakra = user.maxChakra || user.chakra || 100;
      effect = `🔷 Chakra restored: ${before} → ${user.chakra}/${user.maxChakra || user.chakra}`;
    } else if (item.luck) {
      user.luckBoostUntil = Math.max(Date.now(), Number(user.luckBoostUntil) || 0) + item.luck;
      effect = "🍀 Hunt luck increased for 1 hour.";
    }

    await saveRpgUser(sender, user);
    return reply(`✨ *${item.name.toUpperCase()} USED!*\n\n${effect}\n🎒 Remaining: ${countInventoryItem(user, item.id)}`);
  },
};