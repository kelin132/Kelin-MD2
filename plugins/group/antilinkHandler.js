// Clean function to normalize WhatsApp JIDs
const cleanJid = (jid = "") => jid.split(":")[0].split("@")[0] + "@s.whatsapp.net";

export async function antiLinkHandler({ sock, msg }) {
  const jid = msg.key.remoteJid;

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

  const rawSender = msg.key.participant || msg.key.remoteJid;
  if (!rawSender) return;

  // Clean JID to ensure correct format: 1234567890@s.whatsapp.net
  const sender = cleanJid(rawSender);
  const botJid = cleanJid(sock.user?.id ?? "");

  // Never act on the bot itself
  if (sender === botJid) return;

  let botIsAdmin = false;
  let senderIsAdmin = false;

  try {
    const meta = await sock.groupMetadata(jid);
    const adminJids = meta.participants
      .filter(p => p.admin)
      .map(p => cleanJid(p.id));

    botIsAdmin = adminJids.includes(botJid);
    senderIsAdmin = adminJids.includes(sender);
  } catch (e) {
    console.error("Failed to fetch group metadata:", e.message);
  }

  // Don't punish group admins
  if (senderIsAdmin) return;

  const senderNum = sender.split("@")[0];

  try {
    // Attempt to delete message
    await sock.sendMessage(jid, { delete: msg.key });

    const action   = settings.antilinkAction || "delete";
    const maxWarns = settings.antilinkMaxWarns || 3;

    if (action === "kick") {
      if (!botIsAdmin) {
        return sock.sendMessage(jid, {
          text: `⚠️ Cannot kick @${senderNum} because I am not a group admin!`,
          mentions: [sender],
        });
      }

      await sock.groupParticipantsUpdate(jid, [sender], "remove");
      await sock.sendMessage(jid, {
        text: `🚫 @${senderNum} was removed for sending a link.`,
        mentions: [sender],
      });

    } else if (action === "warn") {
      const count = await addLinkWarn(jid, sender);

      if (count >= maxWarns) {
        await resetLinkWarns(jid, sender);
        
        if (botIsAdmin) {
          await sock.groupParticipantsUpdate(jid, [sender], "remove");
        }

        await sock.sendMessage(jid, {
          text: [
            `🚫 *@${senderNum} has been removed from the group!*`,
            ``,
            `Reason: Reached *${maxWarns}/${maxWarns}* anti-link warnings.`,
          ].join("\n"),
          mentions: [sender],
        });
      } else {
        const remaining = maxWarns - count;
        await sock.sendMessage(jid, {
          text: `⚠️ *ANTI-LINK WARNING*\n\n👤 User: @${senderNum}\n🔢 Warnings: *${count}/${maxWarns}*\n⚠️ ${remaining} warning(s) left before removal.`,
          mentions: [sender],
        });
      }

    } else {
      await sock.sendMessage(jid, {
        text: `⚠️ @${senderNum}, links are not allowed here!`,
        mentions: [sender],
      });
    }
  } catch (err) {
    console.error("Anti-link error:", err.message);
  }
}
