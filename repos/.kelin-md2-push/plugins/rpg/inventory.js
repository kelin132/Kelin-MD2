import { countInventoryItem, getRpgUser } from "./db.js";
import { SHOP_ITEMS } from "./shop.js";

export default {
  name: "rpg-inventory",
  aliases: ["rpginv", "rinv", "rpgbag", "rpg-items"],
  category: "rpg",
  description: "View your RPG items and equipment",
  usage: ".rpg-inventory",

  async run({ sock, msg, sender }) {
    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
    const user = await getRpgUser(sender);
    if (!user) return reply("❌ Start your RPG journey with *.rpg-start warrior* first.");

    const lines = ["🎒 *RPG INVENTORY*", "", `💰 Gold: *${user.gold.toLocaleString()}*`, "", "🛡️ *EQUIPPED*"];
    const weapon = SHOP_ITEMS.find((item) => item.id === user.equipment.weapon || item.name === user.equipment.weapon);
    const armor = SHOP_ITEMS.find((item) => item.id === user.equipment.armor || item.name === user.equipment.armor);
    lines.push(`🗡️ Weapon: ${weapon?.name || "None"}`);
    lines.push(`🛡️ Armor: ${armor?.name || "None"}`, "", "🧪 *ITEMS*");

    const items = SHOP_ITEMS
      .filter((item) => item.type === "consumable")
      .map((item) => ({ item, count: countInventoryItem(user, item.id) }))
      .filter(({ count }) => count > 0);
    if (!items.length) lines.push("_Your bag is empty._");
    else for (const { item, count } of items) {
      lines.push(`${item.emoji} ${item.name} ×${count} — \`.rpg-use ${item.id}\``);
    }

    lines.push("", "🛒 Buy items with *.rpg-shop*.");
    return reply(lines.join("\n"));
  },
};