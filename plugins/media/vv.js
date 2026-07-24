// plugins/media/vv.js
// Resend a view-once image or video as normal media.
//
// Usage:
//   .vv   — reply directly to a view-once message
//   .vv @user — reply to a view-once message and mention someone (still works)
//
// Handles Baileys v6+ viewOnceMessageV2 / viewOnceMessageV2Extension wrappers
// and older viewOnce flag on imageMessage / videoMessage.

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
  version: "1.3.0",

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;

    try {
      if (!msg.quoted) {
        return await sock.sendMessage(
          jid,
          { text: "❌ Reply to a view-once message to reveal it." },
          { quoted: msg }
        );
      }

      const quoted = msg.quoted;

      // ── Gather the raw quoted proto message ──────────────────────────────────
      // contextInfo.quotedMessage holds the raw proto (most reliable in Baileys v6+).
      // Fall back to quoted.message (Baileys deserialization) when not present.
      const ctx = (
        msg.message?.extendedTextMessage?.contextInfo ||
        msg.message?.imageMessage?.contextInfo ||
        msg.message?.videoMessage?.contextInfo ||
        msg.message?.stickerMessage?.contextInfo ||
        msg.message?.buttonsResponseMessage?.contextInfo ||
        msg.message?.templateButtonReplyMessage?.contextInfo ||
        null
      );

      const rawQuotedMsg = ctx?.quotedMessage || quoted.message || {};

      // One level deeper — in case the quoted message is itself a reply that
      // carries a view-once in its own contextInfo.
      const innerCtxQuoted =
        rawQuotedMsg.extendedTextMessage?.contextInfo?.quotedMessage || {};

      // ── Helper: locate a viewOnce wrapper in a raw proto message ─────────────
      function extractViewOnce(raw) {
        if (!raw || typeof raw !== "object") return null;

        // Baileys v6+ explicit wrappers
        if (raw.viewOnceMessageV2) {
          return { wrapper: raw, inner: raw.viewOnceMessageV2.message || {} };
        }
        if (raw.viewOnceMessageV2Extension) {
          return { wrapper: raw, inner: raw.viewOnceMessageV2Extension.message || {} };
        }

        // Older proto: viewOnce flag embedded in imageMessage / videoMessage
        if (raw.imageMessage?.viewOnce || raw.videoMessage?.viewOnce) {
          return { wrapper: raw, inner: raw };
        }

        return null;
      }

      // ── Search each layer for a viewOnce payload ─────────────────────────────
      let found =
        extractViewOnce(rawQuotedMsg) ||
        extractViewOnce(innerCtxQuoted);

      // Baileys mtype / viewOnce flags set during deserialization
      if (!found) {
        const isVOType =
          quoted.mtype === "viewOnceMessageV2" ||
          quoted.mtype === "viewOnceMessageV2Extension" ||
          quoted.viewOnce === true;

        if (isVOType) {
          found =
            extractViewOnce(rawQuotedMsg) ||
            { wrapper: rawQuotedMsg, inner: rawQuotedMsg };
        }
      }

      if (!found) {
        return await sock.sendMessage(
          jid,
          {
            text:
              "❌ That message doesn't appear to contain a view-once media.\n" +
              "Make sure you reply *directly* to the view-once message.",
          },
          { quoted: msg }
        );
      }

      const { wrapper, inner } = found;

      // ── Determine media type ─────────────────────────────────────────────────
      let mediaType = null;
      let mediaMsg  = null;

      if (inner.imageMessage) {
        mediaType = "image"; mediaMsg = inner.imageMessage;
      } else if (inner.videoMessage) {
        mediaType = "video"; mediaMsg = inner.videoMessage;
      } else if (inner.audioMessage) {
        mediaType = "audio"; mediaMsg = inner.audioMessage;
      } else if (quoted.imageMessage || quoted.message?.imageMessage) {
        mediaType = "image";
        mediaMsg  = quoted.imageMessage || quoted.message.imageMessage;
      } else if (quoted.videoMessage || quoted.message?.videoMessage) {
        mediaType = "video";
        mediaMsg  = quoted.videoMessage || quoted.message.videoMessage;
      } else if (quoted.audioMessage || quoted.message?.audioMessage) {
        mediaType = "audio";
        mediaMsg  = quoted.audioMessage || quoted.message.audioMessage;
      }

      if (!mediaType || !mediaMsg) {
        return await sock.sendMessage(
          jid,
          { text: "❌ Unsupported media type in this view-once message." },
          { quoted: msg }
        );
      }

      // ── Build the WAMessage object downloadMediaMessage expects ──────────────
      // It needs { key, message } where message is the raw proto containing the
      // viewOnce wrapper. The key must match the *original* view-once message,
      // not the .vv command message.
      const quotedKey = quoted.key || {
        remoteJid: jid,
        fromMe:    false,
        id:        ctx?.stanzaId ?? "",
        participant: ctx?.participant ?? undefined,
      };

      const messageForDownload = wrapper;

      // ── Download ─────────────────────────────────────────────────────────────
      let buffer;
      try {
        buffer = await sock.downloadMediaMessage(
          { key: quotedKey, message: messageForDownload }
        );
      } catch {
        // Fallback: try the inner message directly (older Baileys serialisation)
        buffer = await sock.downloadMediaMessage(
          { key: quotedKey, message: inner }
        );
      }

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
          { audio: buffer, mimetype: mediaMsg.mimetype || "audio/ogg; codecs=opus", ptt: false },
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
