// plugins/naruto/nlearn.js

import players from "../../lib/naruto/players.js";
import jutsuList from "../../lib/naruto/jutsu.js";

export default {
  name: "nlearn",
  description: "Learn new ninja techniques",
  category: "naruto",
  usage: ".nlearn <jutsu_id>",

  async run({ sock, msg, sender, text }) {

    try {

      const player = await players.get(sender);

      if (!player) {
        return sock.sendMessage(
          sender,
          {
            text:
`🥷 You don't have a ninja profile.

Use .nstart first.`
          },
          { quoted: msg }
        );
      }


      // Show available jutsu
      if (!text) {

        const available = jutsuList
          .filter(j => player.level >= j.level)
          .map(j =>
`${j.id}
🌀 ${j.name}
⭐ Level: ${j.level}
💰 Cost: ${j.level * 100} Ryo`
          )
          .join("\n\n");


        return sock.sendMessage(
          sender,
          {
            text:
`📜 AVAILABLE JUTSU

${available || "No jutsu available."}


Use:
.nlearn <jutsu_id>

Example:
.nlearn rasengan`
          },
          { quoted: msg }
        );
      }


      const jutsu = jutsuList.find(
        j => j.id === text.toLowerCase()
      );


      if (!jutsu) {
        return sock.sendMessage(
          sender,
          {
            text:
`❌ Jutsu not found.

Use .nlearn to see available techniques.`
          },
          { quoted: msg }
        );
      }


      if (player.level < jutsu.level) {
        return sock.sendMessage(
          sender,
          {
            text:
`⚠️ Your level is too low.

Required:
Level ${jutsu.level}

Your level:
${player.level}`
          },
          { quoted: msg }
        );
      }


      if (
        jutsu.clan &&
        player.clan.name !== jutsu.clan
      ) {

        return sock.sendMessage(
          sender,
          {
            text:
`❌ Clan restriction!

This jutsu requires:
${jutsu.clan} clan

Your clan:
${player.clan.name}`
          },
          { quoted: msg }
        );

      }


      const already =
        player.jutsu.some(
          j => j.id === jutsu.id
        );


      if (already) {
        return sock.sendMessage(
          sender,
          {
            text:
`🌀 You already know ${jutsu.name}.`
          },
          { quoted: msg }
        );
      }


      const cost = jutsu.level * 100;


      if (player.ryo < cost) {
        return sock.sendMessage(
          sender,
          {
            text:
`💰 Not enough Ryo!

Required:
${cost}

Your Ryo:
${player.ryo}`
          },
          { quoted: msg }
        );
      }


      player.ryo -= cost;


      player.jutsu.push({
        id: jutsu.id,
        name: jutsu.name
      });


      await player.save();


      await sock.sendMessage(
        sender,
        {
          text:
`🎉 JUTSU LEARNED!

🌀 ${jutsu.name}

Rank:
${jutsu.rank}

Type:
${jutsu.type}

💰