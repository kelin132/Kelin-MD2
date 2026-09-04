/**
 * KELIN MD — .hidetag command
 * Tag all members without visible mentions.
 */

export default {
  name: "hidetag",
  description: "Tag all members silently",
  category: "group",
  usage: ".hidetag <message>",
  aliases: ["htag"],
  isAdmin: "true",
  groupOnly: true,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;
    
    try {
      const meta = await sock.groupMetadata(jid);
      const participants = meta.participants.map(p => p.id);
      
      await sock.sendMessage(jid, {
        text: text || "Hello everyone!",
        mentions: participants
      });
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ Error: ${err.message}` }, { quoted: msg });
    }
  }
};
