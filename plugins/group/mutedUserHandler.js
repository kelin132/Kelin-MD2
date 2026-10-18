/**
 * KELIN MD — Muted User Handler
 * Called from bot.mjs on every group message.
 * If the sender is on the group's muted list, delete their message silently.
 */
import { groupSettings } from "../../lib/groupSettings.js";
import { resolveTargetIdentity } from "../../lib/profileIdentity.mjs";

export async function mutedUserHandler({ sock, msg, sender: canonicalSender = "" }) {
  const jid = msg.key.remoteJid;
  if (!jid?.endsWith("@g.us")) return false;

  const settings    = groupSettings.get(jid) || {};
  const mutedUsers  = settings.mutedUsers || {};

  const rawSender = msg.key.participant || msg.key.remoteJid;
  if (!rawSender) return false;
  const sender = canonicalSender || await resolveTargetIdentity(rawSender, {
    sock,
    chatId: jid,
  });

  // Never delete bot's own messages
  const botNum = (sock.user?.id ?? "").split(":")[0];
  if (botNum && sender.startsWith(botNum)) return false;

  if (!mutedUsers[sender]) return false;

  try {
    await sock.sendMessage(jid, { delete: msg.key });
  } catch { /* ignore — message may already be gone */ }

  return true; // message was handled (deleted)
}
