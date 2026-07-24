// plugins/media/vv.js
// Resend a view-once image or video as normal media.
// Works two ways:
//   1. Reply directly to a view-once message → classic usage
//   2. Reply to ANY message → bot also checks if *that* message is a
//      forwarded/nested view-once (e.g. someone quoted a view-once earlier).

export default {
  name: "vv",
  description: "Resend a view-once media as normal media",
  category: "utility",
  usage: ".vv  (reply to a view-once message, or reply to any message that contains one)",
  aliases: ["viewonce"],
  cooldown: 3,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.2.0",

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;

    try {
      if (!msg.quoted) {
        return await sock.sendMessage(
          jid,
          { text: "❌ Reply to a view-once message (or to any message that contains one)." },
          { quoted: msg }
        );
      }

      const quoted = msg.quoted;

      // ── Gather every raw message object we might need to inspect ─────────────
      // Layer 1: the raw quoted message from contextInfo (most reliable in v6+)
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      const rawQuotedMsg = ctx?.quotedMessage || quoted.message || {};

      // Layer 2: if the quoted message is itself a reply, its contextInfo may
      //   carry *its* quoted content (one more level deep).
      const innerCtxQuoted =
        rawQuotedMsg.extendedTextMessage?.contextInfo?.quotedMessage || {};

      // ── Helper: extract viewOnce wrapper + inner media from a raw msg object ──
      function extractViewOnce(raw) {
        if (!raw || typeof raw !== "object") return null;

        // Direct viewOnce wrappers (Baileys v6+)
        const wrapper =
          raw.viewOnceMessageV2 ||
          raw.viewOnceMessageV2Extension ||
          null;

        if (wrapper) {
          const inner = wrapper.message || {};
          return { wrapper: raw, inner };
        }

        // Older serialisation: viewOnce flag on imageMessage/videoMessage
        if (raw.imageMessage?.viewOnce || raw.videoMessage?.viewOnce) {
          return { wrapper: raw, inner: raw };
        }

        return null;
      }

      // ── Try each layer in order ───────────────────────────────────────────────
      // Priority: direct viewOnce → raw quoted msg → one level deeper
      let found =
        extractViewOnce(rawQuotedMsg) ||
        extractViewOnce(quoted.viewOnceMessageV2?.message ? rawQuotedMsg : null) ||
        extractViewOnce(innerCtxQuoted);

      // Also check mtype flags set by the Baileys serialiser
      if (!found) {
        const mtypeMatch =
          quoted.mtype === "viewOnceMessageV2" ||
          quoted.mtype === "viewOnceMessageV2Extension" ||
          quoted.viewOnce;

        if (mtypeMatch) {
          found = extractViewOnce(rawQuotedMsg) || { wrapper: rawQuotedMsg, inner: rawQuotedMsg };
        }
      }

      if (!found) {
        return await sock.sendMessage(
          jid,
          { text: "❌ That message doesn't appear to contain a view-once media.\nMake sure you reply *directly* to the view-once message." },
          { quoted: msg }
        );
      }

      const { wrapper, inner } = found;

      // ── Determine media type from the unwrapped inner message ─────────────────
      let mediaType = null;
      let mediaMsg  = null;

      if (inner.imageMessage) {
        mediaType = "image"; mediaMsg = inner.imageMessage;
      } else if (inner.videoMessage) {
        mediaType = "video"; mediaMsg = inner.videoMessage;
      } else if (inner.audioMessage) {
        mediaType = "audio"; mediaMsg = inner.audioMessage;
      } else {
        // Fallback: check the quoted object directly (older serialisation)
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

      // ── Download ──────────────────────────────────────────────────────────────
      // Pass the full raw quoted message (with wrapper) so Baileys can resolve
      // the correct media key. Fall back to the inner message if that fails.
      let buffer;
      try {
        buffer = await sock.downloadMediaMessage({
          key:     quoted.key || msg.key,
          message: wrapper,
        });
      } catch {
        buffer = await sock.downloadMediaMessage({
          key:     quoted.key || msg.key,
          message: inner,
        });
      }

      // ── Re-send as normal (non-view-once) media ───────────────────────────────
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
