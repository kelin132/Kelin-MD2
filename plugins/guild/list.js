import { readData } from "../../lib/store.mjs";

export default {
  name: "guilds",
  description: "List all guilds",
  category: "guild",
  usage: ".guilds",
  aliases: ["glist"],
  cooldown: 10,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg }) {
    const jid    = msg.key.remoteJid;
    const guilds = Object.values(readData("guilds", {}));
    if (!guilds.length) return sock.sendMessage(jid, { text: "⚔️ No guilds yet. Create one with *.gcreate <name>*" }, { quoted: msg });

    const sorted = guilds.sort((a, b) => b.members.length - a.members.length);
    const lines  = ["⚔️ *All Guilds*", ""];
    sorted.forEach((g, i) => {
      lines.push(`${i + 1}. *${g.name}* — Lv.${g.level} | 👥 ${g.members.length} members`);
    });
    await sock.sendMessage(jid, { text: lines.join("\n") }, { quoted: msg });
  },
};
