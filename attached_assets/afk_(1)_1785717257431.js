const User = require('../models/User');

/**
 * AFK Handler — called on every incoming message.
 * 1. If the sender is AFK → welcome them back and clear AFK.
 * 2. If someone mentions an AFK user → notify the group.
 */
module.exports = async function handleAFK(sock, m, sender, jid) {
  try {
    if (!sender || !jid) return;

    // ── 1. Check if the sender themselves is AFK ──────────────────────────
    const senderUser = await User.findOne({ whatsappNumber: sender });

    if (senderUser && senderUser.afk === true) {
      const afkSince = senderUser.afkSince ? new Date(senderUser.afkSince).getTime() : Date.now();
      const elapsed  = Date.now() - afkSince;

      const days    = Math.floor(elapsed / 86400000);
      const hours   = Math.floor((elapsed % 86400000) / 3600000);
      const minutes = Math.floor((elapsed % 3600000) / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);

      let duration = "";
      if (days > 0)    duration += `${days}d `;
      if (hours > 0)   duration += `${hours}h `;
      if (minutes > 0) duration += `${minutes}m `;
      duration += `${seconds}s`;

      const reason = senderUser.afkReason || "No reason provided";

      // Clear AFK
      senderUser.afk      = false;
      senderUser.afkReason = null;
      senderUser.afkSince  = null;
      await senderUser.save();

      await sock.sendMessage(jid, {
        text:
`👋 *Welcome back, @${sender.split('@')[0]}!*

⏱️ *You were AFK for:* ${duration.trim()}
📌 *Reason was:* ${reason}`,
        mentions: [sender]
      }, { quoted: m });
    }

    // ── 2. Check if any mentioned user is AFK ────────────────────────────
    const mentioned =
      m.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
      m.message?.imageMessage?.contextInfo?.mentionedJid ||
      m.message?.videoMessage?.contextInfo?.mentionedJid ||
      [];

    if (!mentioned.length) return;

    for (const userId of mentioned) {
      if (userId === sender) continue; // skip self-mentions

      const afkUser = await User.findOne({ whatsappNumber: userId });
      if (!afkUser || !afkUser.afk) continue;

      const afkSince = afkUser.afkSince ? new Date(afkUser.afkSince).getTime() : Date.now();
      const elapsed  = Date.now() - afkSince;

      const days    = Math.floor(elapsed / 86400000);
      const hours   = Math.floor((elapsed % 86400000) / 3600000);
      const minutes = Math.floor((elapsed % 3600000) / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);

      let duration = "";
      if (days > 0)    duration += `${days}d `;
      if (hours > 0)   duration += `${hours}h `;
      if (minutes > 0) duration += `${minutes}m `;
      duration += `${seconds}s`;

      const reason = afkUser.afkReason || "No reason provided";

      await sock.sendMessage(jid, {
        text:
`🌙 *@${userId.split('@')[0]} is currently AFK*

📝 *Reason:* ${reason}
⏰ *AFK for:* ${duration.trim()}`,
        mentions: [userId]
      }, { quoted: m });
    }

  } catch (err) {
    console.error("[AFK HANDLER ERROR]", err);
  }
};
