import players from "../../lib/player.js";
import ranks from "../../lib/ranks.js";
import villages from "../../lib/villages.js";
import { healthBar, chakraBar } from "../../lib/utils.js";

function rankForLevel(level) {
  return [...ranks].reverse().find((rank) => level >= rank.level) || ranks[0];
}

export default {
  name: "nprofile",
  aliases: ["ninja profile", "nstat", "nstats"],
  description: "View a Naruto shinobi profile",
  category: "naruto",
  usage: ".nprofile",

  async run({ sock, msg, sender }) {
    const jid = msg.key.remoteJid;
    const player = await players.get(sender);
    if (!player) {
      return sock.sendMessage(jid, { text: "🍃 Start your shinobi journey first with *.nstart*." }, { quoted: msg });
    }

    const village = villages.find((item) => item.id === player.village);
    const rank = rankForLevel(player.level || 1);
    const text = [
      "🍃 *SHINOBI PROFILE*",
      "",
      `👤 ${player.username}`,
      `🌀 Clan: *${player.clan}*`,
      `${village?.emoji || "🏯"} Village: *${village?.name || player.village}*`,
      `🎖️ Rank: *${rank.name}*`,
      `⭐ Level: *${player.level}*  |  XP: ${player.xp}/${player.xpNeeded}`,
      "",
      `❤️ ${healthBar(player.hp, player.maxHp, 12)} ${player.hp}/${player.maxHp}`,
      `💠 ${chakraBar(player.chakra, player.maxChakra, 12)} ${player.chakra}/${player.maxChakra}`,
      "",
      `⚔️ ATK: ${player.attack}  🛡️ DEF: ${player.defense}`,
      `💨 SPD: ${player.speed}  💰 Ryo: ${player.ryo}`,
      `🏆 Wins: ${player.wins || 0}  💀 Losses: ${player.losses || 0}`,
      `📜 Missions: ${player.missionsCompleted || 0}`,
      "",
      `🥷 Jutsu: ${(player.jutsu || []).join(", ")}`,
    ].join("\n");
    return sock.sendMessage(jid, { text }, { quoted: msg });
  },
};