import { readData, writeData } from "../../lib/store.mjs";

export default {
  name: "mods",
  description: "List, add, or remove bot moderators",
  category: "owner",
  usage: ".mods | .addmod @user | .removemod @user",
  aliases: ["addmod", "removemod", "modlist"],
  cooldown: 5,
  isOwner: true,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg, cmd, args }) {
    const jid      = msg.key.remoteJid;
    const modsData = readData("mods", { list: [] });
    const list     = modsData.list ?? [];

    // .mods / .modlist — show list
    if (cmd === "mods" || cmd === "modlist") {
      if (!list.length) return sock.sendMessage(jid, { text: "👮 No mods set yet. Use .addmod @user" }, { quoted: msg });
      const lines = ["👮 *Bot Moderators*", ""];
      list.forEach((n, i) => lines.push(`${i + 1}. +${n}`));
      return sock.sendMessage(jid, { text: lines.join("\n") }, { quoted: msg });
    }

    // Resolve mentioned user
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!mentioned) {
      return sock.sendMessage(jid, {
        text: `Usage:\n.addmod @user — add a mod\n.removemod @user — remove a mod\n.mods — list mods`,
      }, { quoted: msg });
    }
    const num = mentioned.replace(/[^0-9]/g, "");

    if (cmd === "addmod") {
      if (list.includes(num)) return sock.sendMessage(jid, { text: `❌ +${num} is already a mod.` }, { quoted: msg });
      list.push(num);
      writeData("mods", { list });
      return sock.sendMessage(jid, {
        text: `✅ @${num} added as mod.`,
        mentions: [mentioned],
      }, { quoted: msg });
    }

    if (cmd === "removemod") {
      const idx = list.indexOf(num);
      if (idx === -1) return sock.sendMessage(jid, { text: `❌ +${num} is not a mod.` }, { quoted: msg });
      list.splice(idx, 1);
      writeData("mods", { list });
      return sock.sendMessage(jid, {
        text: `✅ @${num} removed from mods.`,
        mentions: [mentioned],
      }, { quoted: msg });
    }
  },
};
