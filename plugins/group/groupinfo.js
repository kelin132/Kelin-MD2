/**
 * KELIN MD — .groupinfo
 * Display detailed group information.
 */
export default {
  name: "groupinfo",
  description: "Show group details",
  category: "group",
  usage: ".groupinfo",
  aliases: ["ginfo", "gcinfo"],
  cooldown: 10,
  isAdmin: false,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith("@g.us")) {
      return sock.sendMessage(jid, {
        text: "❌ This command can only be used in groups.",
      }, { quoted: msg });
    }

    let meta;
    try {
      meta = await sock.groupMetadata(jid);
    } catch {
      return sock.sendMessage(jid, {
        text: "❌ Could not fetch group info.",
      }, { quoted: msg });
    }

    const admins   = meta.participants.filter(p => p.admin).length;
    const members  = meta.participants.length;
    const created  = meta.creation
      ? new Date(meta.creation * 1000).toLocaleDateString("en-GB", {
          day: "2-digit", month: "short", year: "numeric",
        })
      : "Unknown";
    const owner    = meta.owner ? `@${meta.owner.split("@")[0]}` : "Unknown";
    const ownerJid = meta.owner ? [meta.owner] : [];
    const restrict = meta.restrict ? "✅ Admins only" : "❌ All members";
    const announce = meta.announce ? "✅ Admins only" : "❌ All members";

    return sock.sendMessage(jid, {
      text:
`📋 *Group Info*

🏷️ *Name:* ${meta.subject}
📝 *Description:*
${meta.desc || "_(none)_"}

👤 *Owner:* ${owner}
📅 *Created:* ${created}
🆔 *Group ID:* ${jid.split("@")[0]}

👥 *Members:* ${members}
👮 *Admins:* ${admins}

⚙️ *Settings:*
  • Edit info: ${restrict}
  • Send messages: ${announce}`,
      mentions: ownerJid,
    }, { quoted: msg });
  },
};
