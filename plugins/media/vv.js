// plugins/media/vv.js
// Resend a view-once image or video as normal media.
//
// IMPORTANT: This bot does NOT pre-process messages — msg.quoted is undefined.
// All quoted-message data comes from contextInfo on the raw Baileys message,
// exactly like _imageHelper.js, wasted.js, and utilities/sticker.js do.
//
// Works for:
//   .vv          — plain reply to a view-once message
//   .vv @user    — reply to a view-once message while mentioning someone

import { downloadContentFromMessage } from "@whiskeysockets/baileys";

export default {
  name: "vv",
  description: "Resend a view-once media as normal media",
  category: "utility",
  usage: ".vv  (reply to a view-once message)",
  aliases: ["viewonce"],
  cooldown: 3,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.4.0",

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;

    try {
      // ── Get the contextInfo from the raw message ─────────────────────────────
      // Works for all message types that can carry a reply (text, image, etc.)
      const ctx =
        msg.message?.extendedTextMessage?.contextInfo ||
        msg.message?.imageMessage?.contextInfo ||
        msg.message?.videoMessage?.contextInfo ||
        msg.message?.stickerMessage?.contextInfo ||
        msg.message?.buttonsResponseMessage?.contextInfo ||
        null;

      const quotedMessage = ctx?.quotedMessage;

      if (!ctx || !quotedMessage) {
        return sock.sendMessage(
          jid,
          { text: "❌ Reply to a view-once message to reveal it." },
          { quoted: msg }
        );
      }

      // ── Find the viewOnce wrapper and unwrap the inner media ─────────────────
      // Baileys v6+ uses viewOnceMessageV2 / viewOnceMessageV2Extension.
      // Older protos embed viewOnce:true directly on imageMessage/videoMessage.
      const voV2  = quotedMessage.viewOnceMessageV2;
      const voV2E = quotedMessage.viewOnceMessageV2Extension;

      let innerMsg = null;   // the message object that holds imageMessage / videoMessage
      let isViewOnce = false;

      if (voV2) {
        innerMsg   = voV2.message || {};
        isViewOnce = true;
      } else if (voV2E) {
        innerMsg   = voV2E.message || {};
        isViewOnce = true;
      } else if (quotedMessage.imageMessage?.viewOnce) {
        innerMsg   = quotedMessage;
        isViewOnce = true;
      } else if (quotedMessage.videoMessage?.viewOnce) {
        innerMsg   = quotedMessage;
        isViewOnce = true;
      }

      if (!isViewOnce) {
        return sock.sendMessage(
          jid,
          {
            text:
              "❌ That message doesn't appear to contain a view-once media.\n" +
              "Make sure you reply *directly* to the view-once message.",
          },
          { quoted: msg }
        );
      }

      // ── Identify media type ──────────────────────────────────────────────────
      let mediaMsg  = null;
      let mediaType = null;

      if (innerMsg.imageMessage) {
        mediaMsg  = innerMsg.imageMessage;
        mediaType = "image";
      } else if (innerMsg.videoMessage) {
        mediaMsg  = innerMsg.videoMessage;
        mediaType = "video";
      } else if (innerMsg.audioMessage) {
        mediaMsg  = innerMsg.audioMessage;
        mediaType = "audio";
      }

      if (!mediaMsg || !mediaType) {
        return sock.sendMessage(
          jid,
          { text: "❌ Unsupported media type in this view-once message." },
          { quoted: msg }
        );
      }

      // ── Download using downloadContentFromMessage (correct Baileys API) ──────
      // Pass the raw inner media message directly — this is what all working
      // download plugins (utilities/sticker.js, fun/wasted.js) use.
      const stream = await downloadContentFromMessage(mediaMsg, mediaType);
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);

      // ── Re-send as normal (non-view-once) media ──────────────────────────────
      if (mediaType === "image") {
        await sock.sendMessage(
          jid,
          { image: buffer, caption: mediaMsg.caption || "📸 View-once image" },
          { quoted: msg }
        );
      } else if (mediaType === "video") {
        await sock.sendMessage(
          jid,
          { video: buffer, caption: mediaMsg.caption || "🎥 View-once video" },
          { quoted: msg }
        );
      } else if (mediaType === "audio") {
        await sock.sendMessage(
          jid,
          {
            audio:    buffer,
            mimetype: mediaMsg.mimetype || "audio/ogg; codecs=opus",
            ptt:      false,
          },
          { quoted: msg }
        );
      }

    } catch (err) {
      console.error("VV Error:", err);
      await sock.sendMessage(
        jid,
        {
          text:
            "❌ Failed to retrieve the view-once media.\n" +
            "The message may have expired or the media key is no longer valid.",
        },
        { quoted: msg }
      );
    }
  },
};
