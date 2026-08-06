/**
 * KELIN MD — Anti-Link Handler (with warn support)
 * Actions: "delete" | "kick" | "warn"
 * When action is "warn", uses the warns collection.
 * antilinkMaxWarns (per group setting) controls how many link-warns before removal.
 */
import { groupSettings } from "../../lib/groupSettings.js";
import { getDb } from "../../lib/mongo.mjs";

const linkRegex =
  /(?:https?:\/\/|www\.|chat\.whatsapp\.com\/|wa\.me\/|t\.me\/|discord\.gg\/|discord\.com\/invite\/)[^\s]+/i;

async function getLinkWarns(groupJid, userJid) {
  const db  = getDb();
  const doc = await db.collection("antilinkWarns").findOne({ _id: `${groupJid}:${userJid}` });
  return doc || { count: 0 };
}

async function addLinkWarn(groupJid, userJid) {
  const db  = getDb();
  const key = `${groupJid}:${userJid}`;
  const doc = await db.collection("antilinkWarns").findOne({ _id: key }) || { count: 0 };
  const newCount = doc.count + 1;
  await db.collection("antilinkWarns").updateOne(
    { _id: key },
    { $set: { count: newCount, lastWarn: new Date().toISOString() } },
    { upsert: true }
  );
  return newCount;
}

async function resetLinkWarns(groupJid, userJid) {
  const db = getDb();
  await db.collection("antilinkWarns").deleteOne({ _id: `${groupJid}:${userJid}` });
}

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

  const senderNum = sender.split("@")[0];

  try {
    // Always try to delete the link message
    await sock.sendMessage(jid, { delete: msg.key });

    const action     = settings.antilinkAction || "delete";
    const maxWarns   = settings.antilinkMaxWarns || 3;

    if (action === "kick" && botIsAdmin) {
      await sock.groupParticipantsUpdate(jid, [sender], "remove");
      await sock.sendMessage(jid, {
        text: `🚫 @${senderNum} was removed for sending a link.`,
        mentions: [sender],
      });

    } else if (action === "warn") {
      const count = await addLinkWarn(jid, sender);

      if (count >= maxWarns) {
        // Max warnings reached — remove from group
        await resetLinkWarns(jid, sender);
        await sock.sendMessage(jid, {
          text: [
            `🚫 *@${senderNum} has been removed from the group!*`,
            ``,
            `Reason: Reached *${maxWarns}/${maxWarns}* anti-link warnings.`,
            `Please read the group rules before rejoining.`,
          ].join("\n"),
          mentions: [sender],
        });
        if (botIsAdmin) {
          await sock.groupParticipantsUpdate(jid, [sender], "remove");
        }
      } else {
        const remaining = maxWarns - count;
        await sock.sendMessage(jid, {
          text: [
            `⚠️ *ANTI-LINK WARNING*`,
            ``,
            `👤 User    : @${senderNum}`,
            `🔢 Warnings: *${count}/${maxWarns}*`,
            ``,
            remaining === 1
              ? `❗ *One more warning and you will be removed!*`
              : `⚠️ ${remaining} more warning(s) before removal.`,
            ``,
            `Links are not allowed in this group.`,
          ].join("\n"),
          mentions: [sender],
        });
      }

    } else {
      // "delete" action — just warn without tracking
      await sock.sendMessage(jid, {
        text: `⚠️ @${senderNum}, links are not allowed here!`,
        mentions: [sender],
      });
    }
  } catch (err) {
    console.error("Anti-link error:", err.message);
  }
}

// Export helpers so antilink.js command can reset a user's link warns
export { resetLinkWarns };
