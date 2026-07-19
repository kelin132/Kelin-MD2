/**
 * KELIN MD — .mods / .addmod / .removemod
 * Manages the bot moderator list (stored in data/mods.json).
 * Mods get isMod=true in the permission system via lib/permissions.mjs.
 */
import { getMods, saveMods } from "../../lib/permissions.mjs";

export default {
  name: "mods",
  description: "List, add, or remove bot moderators",
  category: "owner",
  usage: ".mods | .addmod @user | .removemod @user",
  aliases: ["addmod", "removemod", "modlist"],
  cooldown: 5,
  isOwner: true,

  async run({ sock, msg, cmd }) {
    const jid  = msg.key.remoteJid;
    const list = getMods(); // live read from data/mods.json

    // ── .mods / .modlist — show current list ──────────────────────────────
    if (cmd === "mods" || cmd === "modlist") {
      if (!list.length) {
        return sock.sendMessage(jid, {
          text:
`👮 *Bot Moderators*

No mods set yet.

Usage:
• *.addmod @user* — grant mod access
• *.removemod @user* — revoke mod access`,
        }, { quoted: msg });
      }

      const lines = [`👮 *Bot Moderators* (${list.length})`, ""];
      list.forEach((num, i) => lines.push(`${i + 1}. +${num}`));
      lines.push("", "_Use .removemod @user to remove._");
      return sock.sendMessage(jid, { text: lines.join("\n") }, { quoted: msg });
    }

    // ── Resolve target JID ────────────────────────────────────────────────
    // Accept: @mention, reply-to-message participant, or bare number in text
    const ctx         = msg.message?.extendedTextMessage?.contextInfo;
    const mentionJid  = ctx?.mentionedJid?.[0];
    const quotedPart  = ctx?.participant;

    // Also accept raw number typed after command: .addmod 27628114340
    const rawText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
    const numArg  = rawText.trim().split(/\s+/).slice(1)[0];
    const numMatch = numArg?.replace(/\D/g, "");

    const targetJid =
      mentionJid ||
      quotedPart ||
      (numMatch?.length >= 7 ? `${numMatch}@s.whatsapp.net` : null);

    if (!targetJid) {
      return sock.sendMessage(jid, {
        text:
`❌ Please specify a user.

Ways to target someone:
• @mention them: *.addmod @user*
• Reply to their message: *.addmod* (while replying)
• Type their number: *.addmod 27628114340*`,
      }, { quoted: msg });
    }

    // Strip to digits for storage — consistent with permission check
    const num = targetJid.split("@")[0].split(":")[0].replace(/\D/g, "");

    // ── .addmod ───────────────────────────────────────────────────────────
    if (cmd === "addmod") {
      if (list.includes(num)) {
        return sock.sendMessage(jid, {
          text: `❌ +${num} is already a mod.`,
          mentions: [targetJid],
        }, { quoted: msg });
      }
      list.push(num);
      saveMods(list);
      return sock.sendMessage(jid, {
        text: `✅ *+${num} is now a bot mod!*\n\nThey can use mod-only commands.`,
        mentions: [targetJid],
      }, { quoted: msg });
    }

    // ── .removemod ────────────────────────────────────────────────────────
    if (cmd === "removemod") {
      const idx = list.indexOf(num);
      if (idx === -1) {
        return sock.sendMessage(jid, {
          text: `❌ +${num} is not in the mods list.`,
          mentions: [targetJid],
        }, { quoted: msg });
      }
      list.splice(idx, 1);
      saveMods(list);
      return sock.sendMessage(jid, {
        text: `✅ +${num} removed from mods.`,
        mentions: [targetJid],
      }, { quoted: msg });
    }
  },
};
