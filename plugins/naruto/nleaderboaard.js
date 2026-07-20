// plugins/naruto/nrank.js

import players from "../../lib/naruto/players.js";
import ranks from "../../lib/naruto/ranks.js";

export default {
  name: "nrank",
  description: "View ninja rank and promotion progress",
  category: "naruto",
  usage: ".nrank,.nr",

  async run({ sock, msg, sender }) {

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


      const currentIndex =
        ranks.findIndex(
          r => r.name === player.rank
        );


      const nextRank =
        ranks[currentIndex + 1];


      let progress;


      if (nextRank) {

        progress =
`🎯 Next Rank:
${nextRank.name}

Required Level:
${nextRank.level}

Your Level:
${player.level}

Progress:
${Math.min(
  100,
  Math.floor(
    (player.level / nextRank.level) * 100
  )
)}%`;

      } else {

        progress =
`🏆 You have reached the highest rank!

You are a Legendary Shinobi.`;

      }


      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text:
`🎖️ NINJA RANK

🥷 Name:
${player.username}

🏯 Village:
${player.village.emoji} ${player.village.name}

👁️ Clan:
${player.clan.name}

Current Rank:
${player.rank}


${progress}`
        },
        { quoted: msg }
      );


    } catch(err) {

      console.log(err);

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text:
          "❌ Failed to check rank."
        },
        { quoted: msg }
      );

    }
  }
};