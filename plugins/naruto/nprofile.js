// plugins/naruto/nprofile.js

import players from "../../lib/naruto/players.js";
import { healthBar, chakraBar } from "../../lib/naruto/utils.js";

export default {
  name: "nprofile",
  description: "View your Naruto ninja profile",
  category: "naruto",
  usage: ".nprofile",

  async run({ sock, msg, sender }) {

    try {

      const player = await players.get(sender);


      if (!player) {
        return sock.sendMessage(
          sender,
          {
            text:
`🥷 You don't have a ninja profile yet.

Use .nstart to begin your ninja journey.`
          },
          { quoted: msg }
        );
      }


      const jutsu =
        player.jutsu
          .map(j => `• ${j.name}`)
          .join("\n") || "None";


      const inventory =
        player.inventory.length
          ? player.inventory.join("\n")
          : "Empty";


      await sock.sendMessage(
        sender,
        {
          text:
`🍃 NINJA PROFILE 🍃

🥷 Name:
${player.username}

🏯 Village:
${player.village.emoji} ${player.village.name}

👁️ Clan:
${player.clan.name}

✨ Ability:
${player.clan.ability}

🎖 Rank:
${player.rank}

🏷 Title:
${player.title}


⭐ Level:
${player.level}

✨ XP:
${player.xp}/${player.xpNeeded}


❤️ HP:
${healthBar(player.hp, player.maxHp)}
${player.hp}/${player.maxHp}

💙 Chakra:
${chakraBar(player.chakra, player.maxChakra)}
${player.chakra}/${player.maxChakra}


⚔ Attack:
${player.attack}

🛡 Defense:
${player.defense}

💨 Speed:
${player.speed}


💰 Ryo:
${player.ryo}


🏆 Battles:
Wins: ${player.wins}
Losses: ${player.losses}


📜 Jutsu:
${jutsu}


🎒 Inventory:
${inventory}`
        },
        { quoted: msg }
      );


    } catch (err) {

      console.log(err);

      await sock.sendMessage(
        sender,
        {
          text:
          "❌ Failed to load ninja profile."
        },
        { quoted: msg }
      );

    }
  }
};
