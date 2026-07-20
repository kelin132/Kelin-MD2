// plugins/naruto/nstart.js

import players from "../../lib/naruto/players.js";
import villages from "../../lib/naruto/villages.js";
import clans from "../../lib/naruto/clans.js";
import { random } from "../../lib/naruto/utils.js";

export default {
  name: "nstart",
  description: "Create your Naruto ninja profile",
  category: "naruto",
  usage: ".nstart",

  async run({ sock, msg, sender }) {

    const jid = msg.key.remoteJid;

    try {

      const existing = await players.get(sender);

      if (existing) {
        return sock.sendMessage(
          jid,
          {
            text:
`🥷 You already have a ninja profile!

Use .nprofile to view your stats.`
          },
          { quoted: msg }
        );
      }


      const village = random(villages);
      const clan = random(clans);


      const player = await players.create({

        jid: sender,

        username:
          msg.pushName || "Unknown Ninja",

        village: {
          id: village.id,
          name: village.name,
          emoji: village.emoji
        },

        clan: {
          name: clan.name,
          ability: clan.ability
        },


        rank: "Academy Student",
        title: "Rookie Ninja",


        level: 1,
        xp: 0,
        xpNeeded: 100,


        hp: 100,
        maxHp: 100,


        chakra: 100,
        maxChakra: 100,


        attack: 10,
        defense: 10,
        speed: 10,


        ryo: 500,


        wins: 0,
        losses: 0,


        jutsu: [
          {
            id: "basic_taijutsu",
            name: "Basic Taijutsu"
          }
        ],


        inventory: [],


        createdAt: new Date()

      });


      // Apply clan bonus

      if (clan.bonus.attack)
        player.attack += clan.bonus.attack;

      if (clan.bonus.hp) {
        player.maxHp += clan.bonus.hp;
        player.hp = player.maxHp;
      }

      if (clan.bonus.chakra) {
        player.maxChakra += clan.bonus.chakra;
        player.chakra = player.maxChakra;
      }


      await player.save();


      await sock.sendMessage(
        jid,
        {
          text:
`🍃 NINJA REGISTRATION COMPLETE 🍃

🥷 Name: ${player.username}

🏯 Village:
${village.emoji} ${village.name}

👁️ Clan:
${clan.name}

⭐ Rank:
Academy Student

❤️ HP:
${player.hp}/${player.maxHp}

💙 Chakra:
${player.chakra}/${player.maxChakra}

⚔ Attack:
${player.attack}

🛡 Defense:
${player.defense}

💨 Speed:
${player.speed}

💰 Ryo:
${player.ryo}

Your ninja journey begins!

Use:
.nprofile
.nmission`
        },
        { quoted: msg }
      );


    } catch (err) {

      console.log(err);

      await sock.sendMessage(
        jid,
        {
          text:
          "❌ Failed to create ninja profile."
        },
        { quoted: msg }
      );

    }
  }
};

