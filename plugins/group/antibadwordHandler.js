/**
 * KELIN MD — antibadwordHandler
 * Called on every message to check for filtered words.
 */
import { groupSettings } from "../../lib/groupSettings.js";

export async function antibadwordHandler({ sock, msg }) {
  const jid = msg.key.remoteJid;
  if (!jid?.endsWith("@g.us")) return;

  const settings = groupSettings.get(jid);
  if (!settings?.antibadword) return;

  const wordList = settings.badwords || [];
  if (!wordList.length) return;

  const text = (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    ""
  ).toLowerCase();

  const found = wordList.find(w => text.includes(w));
  if (!found) return;

  const sender = msg.key.participant || msg.key.remoteJid;
  if (!sender) return;

  // Don't act on the bot itself
  const botNum = (sock.user?.id ?? "").split(":")[0];
  if (sender.startsWith(botNum)) return;

  // Don't act on admins
  try {
    const meta    = await sock.groupMetadata(jid);
    const admins  = meta.participants.filter(p => p.admin).map(p => p.id);
    if (admins.includes(sender)) return;
  } catch { /* continue anyway */ }

  try {
    await sock.sendMessage(jid, { delete: msg.key });
    await sock.sendMessage(jid, {
      text: `⚠️ @${sender.split("@")[0]}, that word is not allowed here!`,
      mentions: [sender],
    });
  } catch (err) {
    console.error("Antibadword handler error:", err.message);
  }
}
