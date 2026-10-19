import { groupSettings } from "../../lib/groupSettings.js";
import { findGroupParticipant, getGroupMetadata, participantIds, personalJid } from "../../lib/groupIdentity.mjs";

export function decodeActivityJid(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^jid_([A-Za-z0-9+/_=-]+)(?:@(?:lid|s\.whatsapp\.net|c\.us))?$/i);
  if (!match) return raw.startsWith("jid_") ? "" : raw;

  try {
    const encoded = match[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = Buffer.from(encoded, "base64").toString("utf8").trim();
    return /^\+?\d+(?::\d+)?@(lid|s\.whatsapp\.net|c\.us)$/i.test(decoded) ? decoded : "";
  } catch {
    return "";
  }
}

export function resolveActiveChatters(rows, metadata) {
  return rows.map(([storedJid, count]) => {
    const decoded = personalJid(decodeActivityJid(storedJid));
    const participant = decoded ? findGroupParticipant(metadata, [decoded]) : null;
    const ids = participantIds(participant);
    const jid = ids.includes(decoded) ? decoded : (ids[0] || decoded);
    const name = String(participant?.notify || participant?.name || participant?.verifiedName || "").trim();
    const tag = jid ? jid.split("@")[0].split(":")[0] : "";
    return {
      jid,
      count: Number(count) || 0,
      label: tag ? `@${tag}${name && name !== tag ? ` (${name})` : ""}` : (name || "Unknown member"),
    };
  });
}

export default {
  name: "active",
  aliases: ["topchatters", "chatters"],
  description: "Rank recorded group chat activity",
  category: "group",
  usage: ".active",
  cooldown: 10,
  isAdmin: true,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    if (!jid?.endsWith("@g.us")) {
      return sock.sendMessage(jid, { text: "👥 This command can only be used in groups." }, { quoted: msg });
    }

    const counts = await groupSettings.getActivityCounts(jid);
    const rows = Object.entries(counts)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 10);

    if (!rows.length) {
      return sock.sendMessage(jid, {
        text: "📈 No group activity samples have been recorded yet. Use the bot normally and check again later.",
      }, { quoted: msg });
    }

    let metadata = null;
    try {
      metadata = await getGroupMetadata(sock, jid);
    } catch { /* Keep usable output if WhatsApp metadata is temporarily unavailable. */ }
    const chatters = resolveActiveChatters(rows, metadata);
    const mentions = [...new Set(chatters.map((member) => member.jid).filter(Boolean))];
    const text = `🏆 *Top chatters*\n\n${chatters
      .map((member, index) => `${index + 1}. ${member.label} — ${member.count} messages`)
      .join("\n")}`;

    return sock.sendMessage(jid, { text, mentions }, { quoted: msg });
  },
};
