import { getPendingWebsiteCode } from "../../lib/websiteAuth.mjs";

export default {
  name: "otp",
  description: "Send the one-time AIDORU website code in a public group chat",
  category: "utilities",
  usage: ".otp",
  cooldown: 30,

  async run({ sock, msg, sender }) {
    const sourceChat = String(msg.key.remoteJid || "").trim();
    const senderJid = String(sender || msg.key.participant || sourceChat || "").trim();
    const quoted = { quoted: msg };
    const isGroup = sourceChat.endsWith("@g.us");

    if (!senderJid) return;
    
    // Inverted check: restrict execution to group chats only
    if (!isGroup) {
      await sock.sendMessage(
        sourceChat,
        { text: "This command can only be used in group chats." },
        quoted,
      );
      return;
    }

    try {
      const pending = await getPendingWebsiteCode(senderJid);
      await sock.sendMessage(
        sourceChat,
        createOtpPayload({ pending, senderJid }),
        quoted,
      );
    } catch (error) {
      const originalMessage = error instanceof Error
        ? error.message
        : "Could not create a reset code.";
      const message = senderJid.endsWith("@lid") &&
        /register first|no active website code/i.test(originalMessage)
        ? "I could not safely map this private WhatsApp ID to a phone number. Try again once WhatsApp provides the verified phone mapping, or contact the bot owner."
        : originalMessage;
      await sock.sendMessage(sourceChat, { text: `❌ ${message}` }, quoted);
    }
  },
};

export function createOtpPayload({ pending, senderJid }) {
  return {
    text: [
      pending.kind === "verification"
        ? "🔐 *AIDORU WEBSITE VERIFICATION CODE*"
        : "🔐 *AIDORU PASSWORD RESET CODE*",
      "",
      `For: *${senderJid.split("@")[0]}*`,
      `One-time code: *${pending.code}*`,
      "",
      `Enter this six-digit code on the AIDORU website before ${new Date(pending.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`,
    ].join("\n"),
  };
}
