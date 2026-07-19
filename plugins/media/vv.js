export default {
  name: "vv",
  description: "Resend a view-once media as normal media",
  category: "utility",
  usage: ".vv",
  aliases: ["viewonce"],
  cooldown: 3,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",

  async run({ sock, msg, text }) {
    try {
      if (!msg.quoted) {
        return await sock.sendMessage(
          msg.key.remoteJid,
          { text: "❌ Reply to a view-once message." },
          { quoted: msg }
        );
      }

      const quoted = msg.quoted;

      if (
        !quoted.viewOnce &&
        !quoted.viewOnceMessageV2 &&
        quoted.mtype !== "viewOnceMessageV2Extension" &&
        quoted.mtype !== "viewOnceMessageV2"
      ) {
        return await sock.sendMessage(
          msg.key.remoteJid,
          { text: "❌ That isn't a view-once message." },
          { quoted: msg }
        );
      }

      let media;

      if (quoted.imageMessage || quoted.message?.imageMessage) {
        media = quoted.imageMessage || quoted.message.imageMessage;
      } else if (quoted.videoMessage || quoted.message?.videoMessage) {
        media = quoted.videoMessage || quoted.message.videoMessage;
      } else if (quoted.audioMessage || quoted.message?.audioMessage) {
        media = quoted.audioMessage || quoted.message.audioMessage;
      }

      if (!media) {
        return await sock.sendMessage(
          msg.key.remoteJid,
          { text: "❌ Unsupported media type." },
          { quoted: msg }
        );
      }

      // Download the media
      const buffer = await sock.downloadMediaMessage(quoted);

      if (quoted.imageMessage || quoted.message?.imageMessage) {
        await sock.sendMessage(
          msg.key.remoteJid,
          {
            image: buffer,
            caption: media.caption || "",
          },
          { quoted: msg }
        );
      } else if (quoted.videoMessage || quoted.message?.videoMessage) {
        await sock.sendMessage(
          msg.key.remoteJid,
          {
            video: buffer,
            caption: media.caption || "",
          },
          { quoted: msg }
        );
      } else if (quoted.audioMessage || quoted.message?.audioMessage) {
        await sock.sendMessage(
          msg.key.remoteJid,
          {
            audio: buffer,
            mimetype: media.mimetype,
            ptt: false,
          },
          { quoted: msg }
        );
      }
    } catch (err) {
      console.error("VV Error:", err);

      await sock.sendMessage(
        msg.key.remoteJid,
        { text: "❌ Failed to retrieve the view-once media." },
        { quoted: msg }
      );
    }
  },
};