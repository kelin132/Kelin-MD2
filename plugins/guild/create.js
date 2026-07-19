import { readData, writeData } from "../../lib/store.mjs";

const CREATE_COST = 1000;

export default {
  name: "gcreate",
  description: "Create a new guild",
  category: "guild",
  usage: ".gcreate <guild name>",
  aliases: ["createguild"],
  cooldown: 10,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg, text, senderNum }) {
    const jid = msg.key.remoteJid;
    if (!text) return sock.sendMessage(jid, { text: "Usage: .gcreate <guild name>" }, { quoted: msg });

    const guilds = readData("guilds", {});
    const eco    = readData("economy", {});

    // Check if already in a guild
    const existing = Object.values(guilds).find((g) => g.members.includes(senderNum));
    if (existing) return sock.sendMessage(jid, { text: `❌ You're already in a guild: *${existing.name}*\nLeave with .gleave first.` }, { quoted: msg });

    // Check cost
    const userEco = eco[senderNum] ?? { coins: 0 };
    if ((userEco.coins ?? 0) < CREATE_COST) {
      return sock.sendMessage(jid, { text: `❌ Creating a guild costs *${CREATE_COST} coins*.\nYou have: *${userEco.coins ?? 0}*` }, { quoted: msg });
    }

    const name = text.trim().slice(0, 32);
    const id   = name.toLowerCase().replace(/\s+/g, "_");

    if (guilds[id]) return sock.sendMessage(jid, { text: `❌ A guild named *${name}* already exists.` }, { quoted: msg });

    guilds[id] = { name, id, leader: senderNum, members: [senderNum], level: 1, xp: 0, created: Date.now() };
    userEco.coins = (userEco.coins ?? 0) - CREATE_COST;
    eco[senderNum] = userEco;

    writeData("guilds", guilds);
    writeData("economy", eco);

    await sock.sendMessage(jid, {
      text: `⚔️ Guild *${name}* created!\n👑 Leader: you\nCost: ${CREATE_COST} coins deducted\n\nUse *.ginfo* to see guild details.`,
    }, { quoted: msg });
  },
};
