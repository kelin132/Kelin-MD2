import { getPendingWebsiteCode } from "../../lib/websiteAuth.mjs";

export default {
  name: "otp",
  description: "Show the one-time AIDORU website code for this WhatsApp account",
  category: "utilities",
  usage: ".otp",
  cooldown: 30,

  async run({ sock, msg, sender }) {
    const sourceChat = String(msg.key.remoteJid || "").trim();
    const senderJid = String(sender || msg.key.participant || sourceChat || "").trim();
    const quoted = { quoted: msg };

    if (sourceChat.endsWith("@g.us")) {
      await sock.sendMessage(sourceChat, {
        text: "❌ For your safety, send *.otp* in a private chat with the bot.",
      }, quoted);
      return;
    }

    if (!senderJid) return;

    try {
      const pending = await getPendingWebsiteCode(senderJid);
      await sock.sendMessage(sourceChat, {
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
      }, quoted);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create a reset code.";
      await sock.sendMessage(sourceChat, { text: `❌ ${message}` }, quoted);
    }
  },
};
