import players from "../../lib/naruto/players.js";

export default {
  name: "nprofile",
  description: "View your Naruto ninja profile",
  category: "naruto",
  usage: ".nprofile",
  aliases: ["ninja", "ncard"],
  cooldown: 5,
  isAdmin: false,

  async run({ sock, msg, sender }) {

    const jid = msg.key.remoteJid;

    const player = await players.get(sender);

    if (!player) {
      return sock.sendMessage(
        jid,
        {
          text:
`🥷 You don't have a ninja profile.

Use .nstart to create your ninja.`
        },
        { quoted: msg }
      );
    }


    return sock.sendMessage(
      jid,
      {
        text:
`🍃 *NINJA PROFILE*

🥷 Name:
${player.username}

🏯 Village:
${player.village.emoji} ${player.village.name}

👁️ Clan:
${player.clan.name}

🎖 Rank:
${player.rank}

⭐ Level:
${player.level}

✨ XP:
${player.xp}/${player.xpNeeded}

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
${player.ryo}`
      },
      { quoted: msg }
    );
  },
};