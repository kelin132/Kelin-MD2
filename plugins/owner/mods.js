/**
 * KELIN MD — .mods / .addmod / .removemod
 * Manages the bot moderator list (stored in data/mods.json).
 */
import { getModsData, saveModsData, getMods } from "../../lib/permissions.mjs";

/** Try every available source to get a display name for a JID. */
async function resolveName(sock, targetJid, chatJid) {
  const num = targetJid.split("@")[0].split(":")[0];

  const c = sock.contacts?.[targetJid] ?? sock.contacts?.[`${num}@s.whatsapp.net`] ?? {};
  const fromContacts = c.notify || c.verifiedName || c.name;
  if (fromContacts) return fromContacts;

  if (chatJid?.endsWith("@g.us")) {
    try {
      const meta = await sock.groupMetadata(chatJid);
      const participant = meta.participants.find(
        p => p.id.split("@")[0].split(":")[0] === num
      );
      if (participant?.name || participant?.notify) {
        return participant.name || participant.notify;
      }
    } catch { /* ignore */ }
  }

  return null;
}

export default {
  name: "mods",
  description: "List, add, or remove bot moderators",
  category: "owner",
  usage: ".mods | .addmod @user | .removemod @user",
  aliases: ["addmod", "removemod", "modlist"],
  cooldown: 5,
  isOwner: false,

  async run({ sock, msg, cmd }) {
    const jid  = msg.key.remoteJid;
    const data = getModsData(); // [{ num, name }]

    // ── .mods / .modlist ──────────────────────────────────────────────────
    if (cmd === "mods" || cmd === "modlist") {
      if (!data.length) {
        return sock.sendMessage(jid, {
          text:
`*MODS*

No mods set yet.

• *.addmod @user* — grant mod access
• *.removemod @user* — revoke mod access`,
        }, { quoted: msg });
      }

      const lines = [`*MODS*`, ``];
      let counter = 1;

      data.forEach(({ num, name }) => {
        const label  = "(MOD)";
        const display = name || `+${num}`;
        lines.push(`${counter}. ${label} ${display}`);
        counter++;
        lines.push(`${counter}. ${label} +${num}`);
        counter++;
        lines.push(``);
      });

      lines.push(`_Use .removemod @user to remove a mod._`);

      return sock.sendMessage(jid, {
        text: lines.join("\n"),
      }, { quoted: msg });
    }

    // ── Resolve target JID ────────────────────────────────────────────────
    const ctx        = msg.message?.extendedTextMessage?.contextInfo;
    const mentionJid = ctx?.mentionedJid?.[0];
    const quotedPart = ctx?.participant;

    const rawText  = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
    const numArg   = rawText.trim().split(/\s+/).slice(1)[0];
    const numMatch = numArg?.replace(/\D/g, "");

    const targetJid =
      mentionJid ||
      quotedPart ||
      (numMatch?.length >= 7 ? `${numMatch}@s.whatsapp.net` : null);

    if (!targetJid) {
      return sock.sendMessage(jid, {
        text:
`❌ Please specify a user.

• @mention them: *.addmod @user*
• Reply to their message: *.addmod* (while replying)
• Type their number: *.addmod 27628114340*`,
      }, { quoted: msg });
    }

    const num  = targetJid.split("@")[0].split(":")[0].replace(/\D/g, "");
    const list = getMods();

    // ── .addmod ───────────────────────────────────────────────────────────
    if (cmd === "addmod") {
      if (list.includes(num)) {
        return sock.sendMessage(jid, {
          text: `❌ +${num} is already a mod.`,
        }, { quoted: msg });
      }

      const resolvedName = await resolveName(sock, targetJid, jid);
      const name = resolvedName || `+${num}`;

      data.push({ num, name });
      saveModsData(data);

      return sock.sendMessage(jid, {
        text: `✅ *${name}* is now a bot mod!\n\n+${num}`,
      }, { quoted: msg });
    }

    // ── .removemod ────────────────────────────────────────────────────────
    if (cmd === "removemod") {
      const idx = data.findIndex(e => e.num === num);
      if (idx === -1) {
        return sock.sendMessage(jid, {
          text: `❌ +${num} is not in the mods list.`,
        }, { quoted: msg });
      }
      const { name } = data[idx];
      data.splice(idx, 1);
      saveModsData(data);
      return sock.sendMessage(jid, {
        text: `✅ *${name}* (+${num}) removed from mods.`,
      }, { quoted: msg });
    }
  },
};
