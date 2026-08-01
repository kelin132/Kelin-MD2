/**
 * .deleteplayer @user
 * Permanently delete a player's account from the database.
 * Requires staff rank. Irreversible — prompts for confirmation.
 */
import { deletePlayer, getUser, isRegistered } from "../economy/database.js";

// Simple in-memory confirmation map: targetJid -> { requesterJid, ts }
const pending = new Map();
const CONFIRM_MS = 30_000;

export default {
  name: "deleteplayer",
  description: "Permanently delete a player's economy account",
  category: "staff",
  usage: ".deleteplayer @user [confirm]",
  aliases: ["delplayer", "removeaccount"],
  isStaff: true,

  async run({ sock, msg, args, sender }) {
    const jid = msg.key.remoteJid;

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    let targetJid = null;

    if (mentioned) {
      targetJid = mentioned;
    } else if (args[0]?.match(/^[0-9]+$/)) {
      targetJid = `${args[0]}@s.whatsapp.net`;
    } else {
      return sock.sendMessage(jid, {
        text: "❓ *Usage:* `.deleteplayer @user`\n\n_You will be asked to confirm before deletion._"
      }, { quoted: msg });
    }

    if (!await isRegistered(targetJid)) {
      return sock.sendMessage(jid, { text: "❌ That player is not registered." }, { quoted: msg });
    }

    const target = await getUser(targetJid);
    const key    = `${sender}:${targetJid}`;
    const now    = Date.now();

    // Check for confirmation
    if (args.includes("confirm")) {
      const pend = pending.get(key);
      if (!pend || now - pend.ts > CONFIRM_MS) {
        pending.delete(key);
        return sock.sendMessage(jid, {
          text: "⚠️ Confirmation expired. Run `.deleteplayer @user` again to restart."
        }, { quoted: msg });
      }
      pending.delete(key);
      await deletePlayer(targetJid);
      return sock.sendMessage(jid, {
        text:
          `🗑️ *Account Deleted*\n\n` +
          `👤 Player : ${target.name}\n` +
          `⚠️ All economy data has been permanently removed.`,
        mentions: [targetJid],
      }, { quoted: msg });
    }

    // First call — store pending and ask for confirmation
    pending.set(key, { ts: now });
    setTimeout(() => pending.delete(key), CONFIRM_MS);

    await sock.sendMessage(jid, {
      text:
        `⚠️ *Are you sure?*\n\n` +
        `You are about to *permanently delete* the account of:\n` +
        `👤 *${target.name}* (${targetJid.split("@")[0]})\n\n` +
        `This action is *irreversible*.\n\n` +
        `Type \`.deleteplayer @user confirm\` within 30 seconds to confirm.`,
      mentions: [targetJid],
    }, { quoted: msg });
  }
};
