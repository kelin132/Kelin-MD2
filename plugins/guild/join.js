import { readData, writeData } from "../../lib/store.mjs";

export default {
  name: "gjoin",
  description: "Join an existing guild",
  category: "guild",
  usage: ".gjoin <guild name>",
  aliases: ["joinguild"],
  cooldown: 10,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg, text, senderNum }) {
    const jid    = msg.key.remoteJid;
    const guilds = readData("guilds", {});

    if (!text) return sock.sendMessage(jid, { text: "Usage: .gjoin <guild name>" }, { quoted: msg });

    // Already in a guild?
    const current = Object.values(guilds).find((g) => g.members.includes(senderNum));
    if (current) return sock.sendMessage(jid, { text: `❌ You're already in *${current.name}*. Leave first with *.gleave*` }, { quoted: msg });

    const id = text.trim().toLowerCase().replace(/\s+/g, "_");
    if (!guilds[id]) return sock.sendMessage(jid, { text: `❌ Guild *${text}* not found.` }, { quoted: msg });

    guilds[id].members.push(senderNum);
    writeData("guilds", guilds);

    await sock.sendMessage(jid, {
      text: `✅ Joined guild *${guilds[id].name}*!\n👥 Members: ${guilds[id].members.length}`,
    }, { quoted: msg });
  },
};
