import players from "../../lib/player.js";
import clans from "../../lib/clans.js";
import villages from "../../lib/villages.js";
import ranks from "../../lib/ranks.js";

const sessions = new Map();

function clanMenu() {
  return [
    "🍃 *CHOOSE YOUR NARUTO CLAN*",
    "",
    ...clans.map((clan, index) => `*${index + 1}.* ${clan.name} — ${clan.ability}`),
    "",
    "Reply with `.nstart <number>`.",
  ].join("\n");
}

function villageMenu() {
  return [
    "🍃 *CHOOSE YOUR HIDDEN VILLAGE*",
    "",
    ...villages.map((village, index) => `*${index + 1}.* ${village.emoji} ${village.name} — ${village.description}`),
    "",
    "Reply with `.nstart <number>`.",
  ].join("\n");
}

export default {
  name: "nstart",
  aliases: ["narutostart", "shinobistart"],
  description: "Create your Naruto shinobi",
  category: "naruto",
  usage: ".nstart",
  cooldown: 3,

  async run({ sock, msg, text, sender }) {
    const jid = msg.key.remoteJid;
    const existing = await players.get(sender);
    if (existing) {
      return sock.sendMessage(jid, {
        text: `🍃 You already have a shinobi, *${existing.username}*.\nUse *.nprofile* to view the profile.`,
      }, { quoted: msg });
    }

    const input = String(text || "").trim();
    let session = sessions.get(sender);

    if (!session) {
      if (!input) {
        sessions.set(sender, { step: "clan" });
        return sock.sendMessage(jid, { text: clanMenu() }, { quoted: msg });
      }
      session = { step: "clan" };
    }

    const choice = Number.parseInt(input, 10);
    if (!Number.isInteger(choice)) {
      return sock.sendMessage(jid, {
        text: session.step === "clan" ? clanMenu() : villageMenu(),
      }, { quoted: msg });
    }

    if (session.step === "clan") {
      if (choice < 1 || choice > clans.length) {
        return sock.sendMessage(jid, { text: `❌ Choose a clan from 1 to ${clans.length}.` }, { quoted: msg });
      }
      session.clan = clans[choice - 1];
      session.step = "village";
      sessions.set(sender, session);
      return sock.sendMessage(jid, { text: villageMenu() }, { quoted: msg });
    }

    if (choice < 1 || choice > villages.length) {
      return sock.sendMessage(jid, { text: `❌ Choose a village from 1 to ${villages.length}.` }, { quoted: msg });
    }

    const village = villages[choice - 1];
    const base = ranks[0];
    const bonus = {};
    for (const source of [session.clan.bonus || {}, village.bonus || {}]) {
      for (const [stat, value] of Object.entries(source)) {
        bonus[stat] = (bonus[stat] || 0) + value;
      }
    }
    const stats = {
      hp: base.hp + (bonus.hp || 0),
      chakra: base.chakra + (bonus.chakra || 0),
      attack: base.attack + (bonus.attack || 0),
      defense: base.defense + (bonus.defense || 0),
      speed: base.speed + (bonus.speed || 0),
    };
    const username = msg.pushName || sender.split("@")[0];

    const player = await players.create({
      jid: sender,
      username,
      clan: session.clan.name,
      village: village.id,
      hp: stats.hp,
      maxHp: stats.hp,
      chakra: stats.chakra,
      maxChakra: stats.chakra,
      attack: stats.attack,
      defense: stats.defense,
      speed: stats.speed,
    });
    sessions.delete(sender);

    return sock.sendMessage(jid, {
      text: [
        `🍃 *WELCOME, ${username.toUpperCase()}*`,
        "",
        `👤 Clan: *${player.clan}*`,
        `${village.emoji} Village: *${village.name}*`,
        "🎖️ Rank: *Academy Student*",
        "",
        `❤️ HP: ${player.hp}/${player.maxHp}`,
        `💠 Chakra: ${player.chakra}/${player.maxChakra}`,
        `⚔️ ATK: ${player.attack}  🛡️ DEF: ${player.defense}  💨 SPD: ${player.speed}`,
        `💰 Starting ryo: ${player.ryo}`,
        "",
        "Use *.nmission* to earn rewards or *.nbattle* to test your chakra.",
      ].join("\n"),
    }, { quoted: msg });
  },
};