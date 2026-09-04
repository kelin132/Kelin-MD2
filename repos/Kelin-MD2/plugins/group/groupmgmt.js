/**
 * KELIN MD — Group management commands
 * .setpp, .setname, .setdesc
 */

export default {
  name: "setname",
  description: "Change group name, description or picture",
  category: "group",
  usage: ".setname <name> | .setdesc <desc> | .setpp (reply to image)",
  aliases: ["groupname", "setgroupname", "setdesc", "groupdesc", "setpp", "grouppp"],
  adminOnly: true,
  groupOnly: true,

  async run({ sock, msg, text, cmd }) {
    const jid = msg.key.remoteJid;

    if (cmd === "setname" || cmd === "groupname" || cmd === "setgroupname") {
      if (!text) return sock.sendMessage(jid, { text: "❌ Provide a new name." }, { quoted: msg });
      try {
        await sock.groupUpdateSubject(jid, text);
        return sock.sendMessage(jid, { text: "✅ Group name updated!" }, { quoted: msg });
      } catch (err) {
        return sock.sendMessage(jid, { text: `❌ Failed: ${err.message}` }, { quoted: msg });
      }
    }

    if (cmd === "setdesc" || cmd === "groupdesc") {
      if (!text) return sock.sendMessage(jid, { text: "❌ Provide a new description." }, { quoted: msg });
      try {
        await sock.groupUpdateDescription(jid, text);
        return sock.sendMessage(jid, { text: "✅ Group description updated!" }, { quoted: msg });
      } catch (err) {
        return sock.sendMessage(jid, { text: `❌ Failed: ${err.message}` }, { quoted: msg });
      }
    }

    if (cmd === "setpp" || cmd === "grouppp") {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const mime = quoted?.imageMessage?.mimetype || msg.message?.imageMessage?.mimetype;
      
      if (!mime || !/image/.test(mime)) {
        return sock.sendMessage(jid, { text: "❌ Reply to or send an image." }, { quoted: msg });
      }

      try {
        const { downloadContentFromMessage } = await import("@whiskeysockets/baileys");
        const stream = await downloadContentFromMessage(
          quoted?.imageMessage || msg.message.imageMessage,
          "image"
        );
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        
        await sock.updateProfilePicture(jid, buffer);
        return sock.sendMessage(jid, { text: "✅ Group profile picture updated!" }, { quoted: msg });
      } catch (err) {
        return sock.sendMessage(jid, { text: `❌ Failed: ${err.message}` }, { quoted: msg });
      }
    }
  }
};
