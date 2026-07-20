// plugins/naruto/ninventory.js

import players from "../../lib/naruto/players.js";
import items from "../../lib/naruto/items.js";

export default {
  name: "ninventory",
  description: "View and use ninja items",
  category: "naruto",
  usage: ".ninventory [item_id]",

  async run({ sock, msg, sender, text }) {

    try {

      const player = await players.get(sender);

      if (!player) {
        return sock.sendMessage(
          msg.key.remoteJid,
          {
            text:
`🥷 You don't have a ninja profile.

Use .nstart first.`
          },
          { quoted: msg }
        );
      }


      // View inventory
      if (!text) {

        const inv =
          player.inventory.length
            ? player.inventory
              .map(i =>
`🎒 ${i.name}
Amount: ${i.amount}`
              )
              .join("\n\n")
            : "Your inventory is empty.";


        return sock.sendMessage(
          msg.key.remoteJid,
          {
            text:
`🎒 NINJA INVENTORY

🥷 ${player.username}

${inv}


Use:
.ninventory <item_id>

Example:
.ninventory small_hp_potion`
          },
          { quoted: msg }
        );

      }


      const itemIndex =
        player.inventory.findIndex(
          i => i.id === text.toLowerCase()
        );


      if (itemIndex === -1) {

        return sock.sendMessage(
          msg.key.remoteJid,
          {
            text:
`❌ You don't have this item.`
          },
          { quoted: msg }
        );

      }


      const item =
        items.find(
          i => i.id === text.toLowerCase()
        );


      if (!item) {
        return sock.sendMessage(
          msg.key.remoteJid,
          {
            text:
`❌ Invalid item.`
          },
          { quoted: msg }
        );
      }


      // Healing effects

      if (item.effect?.hp) {

        player.hp = Math.min(
          player.maxHp,
          player.hp + item.effect.hp
        );

      }


      if (item.effect?.chakra) {

        player.chakra = Math.min(
          player.maxChakra,
          player.chakra + item.effect.chakra
        );

      }


      // XP scroll

      if (item.xp) {

        player.xp += item.xp;

      }


      // Remove item

      player.inventory[itemIndex].amount--;


      if (
        player.inventory[itemIndex].amount <= 0
      ) {
        player.inventory.splice(itemIndex, 1);
      }


      await player.save();


      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text:
`✅ ITEM USED

🛒 ${item.name}

❤️ HP:
${player.hp}/${player.maxHp}

💙 Chakra:
${player.chakra}/${player.maxChakra}

⭐ XP:
${player.xp}/${player.xpNeeded}`
        },
        { quoted: msg }
      );


    } catch(err) {

      console.log(err);

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text:
          "❌ Inventory error."
        },
        { quoted: msg }
      );

    }
  }
};
