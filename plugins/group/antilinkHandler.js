import { groupSettings } from "../../lib/groupSettings.js";

const linkRegex =
  /(?:https?:\/\/|www\.|chat\.whatsapp\.com\/|wa\.me\/|t\.me\/|discord\.gg\/|discord\.com\/invite\/)[^\s]+/i;

export async function antiLinkHandler({ sock, msg }) {
  const jid = msg.key.remoteJid;

  // Only in groups
  if (!jid?.endsWith("@g.us")) return;

  const settings = groupSettings.get(jid);
  if (!settings?.antilink) return;

  const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    "";

  if (!linkRegex.test(text)) return;

  // sender is participant in groups; fallback to remoteJid in DMs
  const sender = msg.key.participant || msg.key.remoteJid;
  if (!sender) return;

  // Never act on the bot itself
  const botJid = sock.user?.id ?? "";
  const botNum = botJid.split(":")[0];
  if (sender.startsWith(botNum)) return;

  // Check if bot is admin — required to delete or kick
  let botIsAdmin = false;
  let senderIsAdmin = false;
  try {
    const meta = await sock.groupMetadata(jid);
    const admins = meta.participants.filter(p => p.admin).map(p => p.id);
    botIsAdmin    = admins.some(a => a.startsWith(botNum));
    senderIsAdmin = admins.includes(sender);
  } catch { /* if metadata fails, still try to delete */ }

  // Don't punish group admins
  if (senderIsAdmin) return;

  try {
    // Always try to delete the link message
    await sock.sendMessage(jid, { delete: msg.key });

    if (settings.antilinkAction === "kick" && botIsAdmin) {
      await sock.groupParticipantsUpdate(jid, [sender], "remove");
      await sock.sendMessage(jid, {
        text: `🚫 @${sender.split("@")[0]} was removed for sending a link.`,
        mentions: [sender],
      });
    } else if (settings.antilinkAction === "delete") {
      await sock.sendMessage(jid, {
        text: `⚠️ @${sender.split("@")[0]}, links are not allowed here!`,
        mentions: [sender],
      });
    }
  } catch (err) {
    console.error("Anti-link error:", err.message);
  }
}
