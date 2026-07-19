import { readData, writeData } from "../../lib/store.mjs";

export default {
  name: "gleave",
  description: "Leave your current guild",
  category: "guild",
  usage: ".gleave",
  aliases: ["leaveguild"],
  cooldown: 10,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg, senderNum }) {
    const jid    = msg.key.remoteJid;
    const guilds = readData("guilds", {});

    const entry = Object.entries(guilds).find(([, g]) => g.members.includes(senderNum));
    if (!entry) return sock.sendMessage(jid, { text: "❌ You're not in any guild." }, { quoted: msg });

    const [id, guild] = entry;
    if (guild.leader === senderNum && guild.members.length > 1) {
      return sock.sendMessage(jid, { text: `❌ You're the guild leader. Transfer leadership or disband the guild first.` }, { quoted: msg });
    }

    if (guild.leader === senderNum) {
      // Disband if alone
      delete guilds[id];
      writeData("guilds", guilds);
      return sock.sendMessage(jid, { text: `💀 Guild *${guild.name}* has been disbanded (no members left).` }, { quoted: msg });
    }

    guild.members = guild.members.filter((m) => m !== senderNum);
    writeData("guilds", guilds);
    await sock.sendMessage(jid, { text: `👋 You left guild *${guild.name}*.` }, { quoted: msg });
  },
};
