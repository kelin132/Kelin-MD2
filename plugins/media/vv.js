// plugins/media/vv.js
// Resend a view-once image or video as normal media

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
  version: "1.1.0",

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;

    try {
      if (!msg.quoted) {
        return await sock.sendMessage(
          jid,
          { text: "❌ Reply to a view-once message." },
          { quoted: msg }
        );
      }

      const quoted = msg.quoted;

      // ── Detect view-once at every nesting level Baileys may produce ─────────
      // Baileys v6+ wraps view-once content in viewOnceMessageV2 or
      // viewOnceMessageV2Extension inside the raw contextInfo quotedMessage.
      const rawQuotedMsg =
        msg.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
        quoted.message ||
        {};

      const isViewOnce = !!(
        rawQuotedMsg.viewOnceMessageV2 ||
        rawQuotedMsg.viewOnceMessageV2Extension ||
        quoted.viewOnce ||
        quoted.viewOnceMessageV2 ||
        quoted.viewOnceMessageV2Extension ||
        quoted.mtype === "viewOnceMessageV2" ||
        quoted.mtype === "viewOnceMessageV2Extension"
      );

      if (!isViewOnce) {
        return await sock.sendMessage(
          jid,
          { text: "❌ That isn't a view-once message." },
          { quoted: msg }
        );
      }

      // ── Extract the inner media message from the viewOnce wrapper ───────────
      // The actual imageMessage / videoMessage is nested inside the wrapper.
      const innerMsg =
        rawQuotedMsg.viewOnceMessageV2?.message ||
        rawQuotedMsg.viewOnceMessageV2Extension?.message ||
        quoted.viewOnceMessageV2?.message ||
        quoted.viewOnceMessageV2Extension?.message ||
        rawQuotedMsg;

      // Determine media type from the unwrapped inner message
      let mediaType = null;
      let mediaMsg  = null;

      if (innerMsg.imageMessage) {
        mediaType = "image";
        mediaMsg  = innerMsg.imageMessage;
      } else if (innerMsg.videoMessage) {
        mediaType = "video";
        mediaMsg  = innerMsg.videoMessage;
      } else if (innerMsg.audioMessage) {
        mediaType = "audio";
        mediaMsg  = innerMsg.audioMessage;
      } else {
        // Fallback: check the quoted object directly (older Baileys serialization)
        if (quoted.imageMessage || quoted.message?.imageMessage) {
          mediaType = "image";
          mediaMsg  = quoted.imageMessage || quoted.message.imageMessage;
        } else if (quoted.videoMessage || quoted.message?.videoMessage) {
          mediaType = "video";
          mediaMsg  = quoted.videoMessage || quoted.message.videoMessage;
        } else if (quoted.audioMessage || quoted.message?.audioMessage) {
          mediaType = "audio";
          mediaMsg  = quoted.audioMessage || quoted.message.audioMessage;
        }
      }

      if (!mediaType || !mediaMsg) {
        return await sock.sendMessage(
          jid,
          { text: "❌ Unsupported media type in this view-once message." },
          { quoted: msg }
        );
      }

      // ── Download the media ──────────────────────────────────────────────────
      // Build a downloadable WAMessage object. For view-once, pass the full
      // raw quoted message (including the viewOnce wrapper) so Baileys can
      // locate the correct media key for decryption.
      const downloadTarget = {
        key:     quoted.key || msg.key,
        message: rawQuotedMsg,
      };

      let buffer;
      try {
        buffer = await sock.downloadMediaMessage(downloadTarget);
      } catch {
        // Fallback: try downloading with just the inner media message
        buffer = await sock.downloadMediaMessage({
          key:     quoted.key || msg.key,
          message: innerMsg,
        });
      }

      // ── Re-send as normal (non-view-once) media ─────────────────────────────
      if (mediaType === "image") {
        await sock.sendMessage(
          jid,
          { image: buffer, caption: mediaMsg.caption || "" },
          { quoted: msg }
        );
      } else if (mediaType === "video") {
        await sock.sendMessage(
          jid,
          { video: buffer, caption: mediaMsg.caption || "" },
          { quoted: msg }
        );
      } else if (mediaType === "audio") {
        await sock.sendMessage(
          jid,
          { audio: buffer, mimetype: mediaMsg.mimetype || "audio/ogg", ptt: false },
          { quoted: msg }
        );
      }
    } catch (err) {
      console.error("VV Error:", err);

      await sock.sendMessage(
        jid,
        { text: "❌ Failed to retrieve the view-once media. The message may have expired or the media key is no longer available." },
        { quoted: msg }
      );
    }
  },
};
