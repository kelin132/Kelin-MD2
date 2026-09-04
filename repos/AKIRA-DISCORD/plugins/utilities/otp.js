import { generateOtp, getOrCreateWebsiteId } from "../../lib/websiteAuth.mjs";

export default {
  name: "otp",
  description: "Send a one-time AIDORU password reset code in a group",
  category: "utilities",
  usage: ".otp",
  cooldown: 30,

  async run({ sock, msg, sender }) {
    const sourceChat = String(msg.key.remoteJid || "").trim();
    const senderJid = String(sender || msg.key.participant || sourceChat || "").trim();
    const quoted = { quoted: msg };

    if (!sourceChat.endsWith("@g.us")) {
      if (sourceChat) {
        await sock.sendMessage(sourceChat, {
          text: "❌ Use *.otp* in a group chat. For your safety, reset codes are never sent in private messages.",
        }, quoted);
      }
      return;
    }

    if (!senderJid) return;

    try {
      const websiteId = await getOrCreateWebsiteId(senderJid);
      const code = await generateOtp(websiteId);
      await sock.sendMessage(sourceChat, {
        text: [
          "🔐 *AIDORU PASSWORD RESET CODE*",
          "",
          `For: *${senderJid.split("@")[0]}*`,
          `AIDORU ID: *${websiteId}*`,
          `One-time code: *${code}*`,
          "",
          "Enter this six-digit code on the AIDORU website within 10 minutes.",
        ].join("\n"),
      }, quoted);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create a reset code.";
      await sock.sendMessage(sourceChat, { text: `❌ ${message}` }, quoted);
    }
  },
};
