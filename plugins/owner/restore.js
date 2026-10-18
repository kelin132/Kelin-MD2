/**
 * .restore @user | <number>
 * Restore AIDORU website access without changing bot ban status.
 * Owner only.
 */
import { restoreWebsiteUser, getUser } from "../economy/database.js";
import { resolveTargetIdentity } from "../../lib/profileIdentity.mjs";

export default {
  name: "restore",
  description: "Restore a user's AIDORU website access",
  category: "owner",
  usage: ".restore @user | .restore <number>",
  aliases: ["restoreweb", "unbanweb"],
  isOwner: true,

  async run({ sock, msg, args, sender }) {
    const jid = msg.key.remoteJid;
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const targetJid = mentioned || (args[0]?.match(/^\d+$/) ? `${args[0]}@s.whatsapp.net` : null);

    if (!targetJid) {
      return sock.sendMessage(
        jid,
        { text: "❓ *Usage:* `.restore @user` | `.restore <number>`" },
        { quoted: msg },
      );
    }
    const resolvedTargetJid = await resolveTargetIdentity(targetJid, { sender, sock, chatId: jid });

    let user;
    try {
      user = await getUser(resolvedTargetJid);
    } catch {
      user = null;
    }

    if (!user) {
      return sock.sendMessage(jid, { text: "❌ That player is not registered." }, { quoted: msg });
    }

    if (!user.websiteBanned) {
      return sock.sendMessage(
        jid,
        { text: `❌ *${user.name || resolvedTargetJid.split("@")[0]}* is not currently banned from the website.` },
        { quoted: msg },
      );
    }

    await restoreWebsiteUser(resolvedTargetJid);

    return sock.sendMessage(
      jid,
      {
        text:
          `✅ *Website Access Restored*\n\n` +
          `👤 Player : ${user.name || resolvedTargetJid.split("@")[0]}\n` +
          `🌐 Access : AIDORU website restored\n` +
          `🔐 Session : Previous website sessions revoked\n\n` +
          `_Bot ban status was not changed. The player must log in again._`,
        mentions: [resolvedTargetJid],
      },
      { quoted: msg },
    );
  },
};
