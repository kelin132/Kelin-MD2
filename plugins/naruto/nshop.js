// plugins/naruto/nshop.js

import players from "../../lib/naruto/players.js";
import items from "../../lib/naruto/items.js";

export default {
  name: "nshop",
  description: "Buy ninja items",
  category: "naruto",
  usage: ".nshop <item_id>",

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


      // Show shop
      if (!text) {

        const shop = items
          .map(item =>
`🛒 ${item.name}

ID:
${item.id}

💰 Price:
${item.price} Ryo

${item.description}`
          )
          .join("\n\n");


        return sock.sendMessage(
          msg.key.remoteJid,
          {
            text:
`🏪 NINJA SHOP

${shop}


Buy:
.nshop <item_id>

Example:
.nshop kunai`
          },
          { quoted: msg }
        );

      }


      const item = items.find(
        i => i.id === text.toLowerCase()
      );


      if (!item) {
        return sock.sendMessage(
          msg.key.remoteJid,
          {
            text:
`❌ Item not found.

Use .nshop to view items.`
          },
          { quoted: msg }
        );
      }


      if (player.ryo < item.price) {

        return sock.sendMessage(
          msg.key.remoteJid,
          {
            text:
`💰 Not enough Ryo!

Item:
${item.name}

Price:
${item.price}

Your Ryo:
${player.ryo}`
          },
          { quoted: msg }
        );

      }


      player.ryo -= item.price;


      player.inventory.push({
        id: item.id,
        name: item.name,
        amount: 1
      });


      await player.save();


      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text:
`✅ PURCHASE COMPLETE

🛒 Item:
${item.name}

💰 Paid:
${item.price} Ryo

💳 Remaining:
${player.ryo} Ryo

Use .ninventory to view items.`
        },
        { quoted: msg }
      );


    } catch(err) {

      console.log(err);

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text:
          "❌ Shop error."
        },
        { quoted: msg }
      );

    }
  }
};
