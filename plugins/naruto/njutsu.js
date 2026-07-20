// plugins/naruto/njutsu.js

import players from "../../lib/naruto/players.js";

export default {
  name: "njutsu",
  description: "View your learned jutsu",
  category: "naruto",
  usage: ".njutsu",

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


      const jutsuList =
        player.jutsu
          .map((j, i) =>
`${i + 1}. 🌀 ${j.name}`
          )
          .join("\n");


      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text:
`🌀 YOUR JUTSU LIST

🥷 Ninja:
${player.username}

👁️ Clan:
${player.clan.name}


${jutsuList || "No jutsu learned yet."}


Use .nlearn to learn new techniques.`
        },
        { quoted: msg }
      );


    } catch (err) {

      console.log(err);

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text:
          "❌ Failed to load jutsu."
        },
        { quoted: msg }
      );

    }
  }
};
