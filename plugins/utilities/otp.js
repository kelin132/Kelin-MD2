import { getPendingWebsiteCode } from "../../lib/websiteAuth.mjs";

export default {
  name: "otp",
  description: "Send the one-time AIDORU website code in private chat or a group",
  category: "utilities",
  usage: ".otp",
  cooldown: 30,

  async run({ sock, msg, sender }) {
    const sourceChat = String(msg.key.remoteJid || "").trim();
    const senderJid = String(sender || msg.key.participant || sourceChat || "").trim();
    const quoted = { quoted: msg };
    const isGroup = sourceChat.endsWith("@g.us");

    if (!senderJid) return;

    try {
      const pending = await getPendingWebsiteCode(senderJid);
      await sock.sendMessage(
        sourceChat,
        createOtpPayload({ pending, senderJid, isGroup }),
        isGroup ? { ...quoted, mentions: [senderJid] } : quoted,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create a reset code.";
      await sock.sendMessage(sourceChat, { text: `❌ ${message}` }, quoted);
    }
  },
};

export function createOtpPayload({ pending, senderJid, isGroup = false }) {
  const accountLabel = isGroup
    ? `@${senderJid.split("@")[0]}`
    : `*${senderJid.split("@")[0]}*`;

  return {
    text: [
      pending.kind === "verification"
        ? "🔐 *AIDORU WEBSITE VERIFICATION CODE*"
        : "🔐 *AIDORU PASSWORD RESET CODE*",
      "",
      `For: ${accountLabel}`,
      `One-time code: *${pending.code}*`,
      "",
      `Enter this six-digit code on the AIDORU website before ${new Date(pending.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`,
    ].join("\n"),
  };
}
