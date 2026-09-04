/**
 * KELIN MD — antimentionHandler
 * Detects mass-mention spam in groups.
 * Called on every message in bot.mjs — same pattern as antispamHandler.
 *
 * Threshold: if a single message mentions >= N users (default 6),
 * delete the message and warn; second offence → remove.
 */
import { groupSettings } from "../../lib/groupSettings.js";

// Map<groupJid, Map<senderJid, { warned, warnTimer }>>
const mentionTracker = new Map();

export async function antimentionHandler({ sock, msg }) {
  const jid = msg.key.remoteJid;
  if (!jid?.endsWith("@g.us")) return;

  const settings = groupSettings.get(jid) || {};
  if (!settings.antimention) return;

  const sender = msg.key.participant || msg.key.remoteJid;
  if (!sender) return;

  // Never act on the bot's own messages
  const botNum = (sock.user?.id ?? "").split(":")[0];
  if (sender.startsWith(botNum)) return;

  // Skip admins
  try {
    const meta   = await sock.groupMetadata(jid);
    const admins = meta.participants.filter(p => p.admin).map(p => p.id);
    if (admins.includes(sender)) return;
  } catch { /* continue */ }

  // Count mentions in this message
  const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
  const threshold = settings.antimentionThreshold || 6;

  if (mentionedJids.length < threshold) return;

  // Init trackers
  if (!mentionTracker.has(jid)) mentionTracker.set(jid, new Map());
  const groupMap  = mentionTracker.get(jid);
  if (!groupMap.has(sender)) groupMap.set(sender, { warned: false });
  const userData  = groupMap.get(sender);

  const senderNum = sender.split("@")[0];

  try {
    // Try to delete the message if bot is admin
    await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});

    if (!userData.warned) {
      userData.warned = true;
      // Auto-clear warn after 5 minutes
      clearTimeout(userData.warnTimer);
      userData.warnTimer = setTimeout(() => { userData.warned = false; }, 5 * 60_000);

      await sock.sendMessage(jid, {
        text:
`⚠️ *ANTI-MENTION WARNING*

👤 @${senderNum} tagged *${mentionedJids.length} people* in one message.
❗ Mass mentions are not allowed in this group.

Next offence you will be removed.`,
        mentions: [sender],
      });
    } else {
      userData.warned = false;
      clearTimeout(userData.warnTimer);
      await sock.groupParticipantsUpdate(jid, [sender], "remove");
      await sock.sendMessage(jid, {
        text: `🚫 @${senderNum} was removed for mass-mentioning members.`,
        mentions: [sender],
      });
    }
  } catch (err) {
    console.error("Antimention handler error:", err.message);
  }
}
