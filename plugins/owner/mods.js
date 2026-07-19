/**
 * KELIN MD — .mods / .addmod / .removemod
 * Manages the bot moderator list stored in data/mods.json.
 * Mods get isMod=true in all permission checks (see lib/permissions.mjs).
 */
import { readData, writeData } from "../../lib/store.mjs";

export default {
  name: "mods",
  description: "List, add, or remove bot moderators",
  category: "owner",
  usage: ".mods | .addmod @user | .removemod @user",
  aliases: ["addmod", "removemod", "modlist"],
  cooldown: 5,
  isOwner: true,
  async run({ sock, msg, cmd, args }) {
    const jid      = msg.key.remoteJid;
    const modsData = readData("mods", { list: [] });
    const list     = Array.isArray(modsData.list) ? modsData.list : [];

    // .mods / .modlist — show list
    if (cmd === "mods" || cmd === "modlist") {
      if (!list.length) {
        return sock.sendMessage(jid, {
          text: "👮 No mods set yet.\n\nUsage:\n• *.addmod @user* — grant mod\n• *.removemod @user* — revoke mod"
        }, { quoted: msg });
      }
      const lines = [`👮 *Bot Moderators* (${list.length})`, ""];
      list.forEach((n, i) => lines.push(`${i + 1}. +${n}`));
      lines.push("", "_Use .removemod @user to remove._");
      return sock.sendMessage(jid, { text: lines.join("\n") }, { quoted: msg });
    }

    // Resolve mentioned user from @mention or bare number arg
    const mentioned =
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
      (args[0]?.match(/^\d{7,15}$/) ? `${args[0]}@s.whatsapp.net` : null);

    if (!mentioned) {
      return sock.sendMessage(jid, {
        text: `❌ Please *@mention* the user.\n\nExamples:\n• *.addmod @user*\n• *.removemod @user*\n• *.mods* — list all mods`
      }, { quoted: msg });
    }

    const num = mentioned.replace(/[^0-9]/g, "");

    if (cmd === "addmod") {
      if (list.includes(num)) {
        return sock.sendMessage(jid, {
          text: `❌ @${num} is already a mod.`,
          mentions: [mentioned]
        }, { quoted: msg });
      }
      list.push(num);
      writeData("mods", { list });
      return sock.sendMessage(jid, {
        text: `✅ *@${num} added as bot mod!*\n\nThey can now use mod-only commands.`,
        mentions: [mentioned]
      }, { quoted: msg });
    }

    if (cmd === "removemod") {
      const idx = list.indexOf(num);
      if (idx === -1) {
        return sock.sendMessage(jid, {
          text: `❌ @${num} is not a mod.`,
          mentions: [mentioned]
        }, { quoted: msg });
      }
      list.splice(idx, 1);
      writeData("mods", { list });
      return sock.sendMessage(jid, {
        text: `✅ @${num} removed from mods.`,
        mentions: [mentioned]
      }, { quoted: msg });
    }
  },
};
