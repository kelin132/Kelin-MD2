import players from "../../lib/player.js";
import items from "../../lib/items.js";

function itemId(value) {
  return typeof value === "string" ? value : value?.id;
}

export default {
  name: "ninventory",
  aliases: ["ninv", "nuse"],
  description: "View or use Naruto inventory items",
  category: "naruto",
  usage: ".ninventory [use <item id>]",

  async run({ sock, msg, text, sender }) {
    const jid = msg.key.remoteJid;
    const player = await players.get(sender);
    if (!player) {
      return sock.sendMessage(jid, { text: "🍃 Use *.nstart* before opening your inventory." }, { quoted: msg });
    }

    const words = String(text || "").trim().split(/\s+/).filter(Boolean);
    if (words[0]?.toLowerCase() !== "use") {
      const counts = new Map();
      for (const entry of player.inventory || []) {
        const id = itemId(entry);
        counts.set(id, (counts.get(id) || 0) + 1);
      }
      const lines = [...counts.entries()].map(([id, count]) => {
        const item = items.find((candidate) => candidate.id === id);
        return `• *${item?.name || id}* ×${count}`;
      });
      return sock.sendMessage(jid, {
        text: `🎒 *NINJA INVENTORY*\n\n${lines.length ? lines.join("\n") : "_Your inventory is empty._"}\n\nUse an item with \`.ninventory use <item id>\`.`,
      }, { quoted: msg });
    }

    const wanted = words.slice(1).join("_").toLowerCase();
    const index = (player.inventory || []).findIndex((entry) => itemId(entry)?.toLowerCase() === wanted);
    const item = items.find((candidate) => candidate.id === wanted);
    if (!item || index < 0) {
      return sock.sendMessage(jid, { text: "❌ You do not have that item. Use *.ninventory* to check your bag." }, { quoted: msg });
    }
    if (item.type !== "consumable") {
      return sock.sendMessage(jid, { text: `❌ *${item.name}* cannot be used outside a battle.` }, { quoted: msg });
    }

    const effect = item.effect || {};
    player.hp = Math.min(player.maxHp, player.hp + (effect.hp || 0));
    player.chakra = Math.min(player.maxChakra, player.chakra + (effect.chakra || 0));
    player.inventory.splice(index, 1);
    await player.save();
    return sock.sendMessage(jid, {
      text: `✨ Used *${item.name}*.\n❤️ HP: ${player.hp}/${player.maxHp}\n💠 Chakra: ${player.chakra}/${player.maxChakra}`,
    }, { quoted: msg });
  },
};