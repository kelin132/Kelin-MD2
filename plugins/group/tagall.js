/**
 * KELIN MD — .tagall / .hidetag
 * .tagall  — Mention all group members visibly
 * .hidetag — Mention all group members silently (no visible @tags)
 */
export default {
  name: "tagall",
  description: "Mention all group members",
  category: "group",
  usage: ".tagall [message] | .hidetag [message]",
  aliases: ["hidetag"],
  cooldown: 10,
  isAdmin: true,

  async run({ sock, msg, args, cmd }) {
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

    const participants = meta.participants.map(p => p.id);
    const customText   = args.join(" ").trim();

    if (cmd === "hidetag") {
      // Send a single message with mentions but no visible @tags in text
      const text = customText || `📢 *Message for everyone*\n\n${meta.subject}`;
      return sock.sendMessage(jid, {
        text,
        mentions: participants,
      }, { quoted: msg });
    }

    // .tagall — build visible @number list
    const tags = participants.map(p => `@${p.split("@")[0]}`).join(" ");
    const header = customText
      ? `📢 *${customText}*\n\n`
      : `👥 *Tagging everyone in ${meta.subject}*\n\n`;

    return sock.sendMessage(jid, {
      text: header + tags,
      mentions: participants,
    }, { quoted: msg });
  },
};
