/**
 * KELIN MD — antispamHandler
 * Tracks message frequency per user per group. Called on every message.
 * Threshold: 5 messages within 5 seconds → warn; second offence → kick.
 */
import { groupSettings } from "../../lib/groupSettings.js";

// Map<groupJid, Map<senderJid, { count, timer, warned }>>
const spamTracker = new Map();

const LIMIT    = 5;    // messages
const WINDOW   = 5000; // milliseconds

export async function antispamHandler({ sock, msg }) {
  const jid = msg.key.remoteJid;
  if (!jid?.endsWith("@g.us")) return;

  const settings = groupSettings.get(jid);
  if (!settings?.antispam) return;

  const sender = msg.key.participant || msg.key.remoteJid;
  if (!sender) return;

  // Never act on the bot itself
  const botNum = (sock.user?.id ?? "").split(":")[0];
  if (sender.startsWith(botNum)) return;

  // Don't act on admins
  try {
    const meta   = await sock.groupMetadata(jid);
    const admins = meta.participants.filter(p => p.admin).map(p => p.id);
    if (admins.includes(sender)) return;
  } catch { /* continue */ }

  // Init group tracker
  if (!spamTracker.has(jid)) spamTracker.set(jid, new Map());
  const groupMap = spamTracker.get(jid);

  // Init user tracker
  if (!groupMap.has(sender)) {
    groupMap.set(sender, { count: 0, timer: null, warned: false });
  }

  const userData = groupMap.get(sender);
  userData.count++;

  // Reset counter after the window
  if (userData.timer) clearTimeout(userData.timer);
  userData.timer = setTimeout(() => {
    userData.count = 0;
  }, WINDOW);

  if (userData.count < LIMIT) return;

  // Threshold hit — reset count immediately
  userData.count = 0;

  try {
    if (!userData.warned) {
      // First offence: warn
      userData.warned = true;
      // Reset warned flag after 60s
      setTimeout(() => { userData.warned = false; }, 60_000);

      await sock.sendMessage(jid, {
        text: `⚠️ @${sender.split("@")[0]}, *slow down!* Spamming is not allowed.\nNext offence you will be removed.`,
        mentions: [sender],
      });
    } else {
      // Second offence: kick
      userData.warned = false;
      await sock.groupParticipantsUpdate(jid, [sender], "remove");
      await sock.sendMessage(jid, {
        text: `🚫 @${sender.split("@")[0]} was removed for spamming.`,
        mentions: [sender],
      });
    }
  } catch (err) {
    console.error("Antispam handler error:", err.message);
  }
}
