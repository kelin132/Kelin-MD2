import { generateOtp, getOrCreateWebsiteId } from "../../lib/websiteAuth.mjs";

export default {
  name: "otp",
  description: "Send a one-time AIDORU password reset code",
  category: "utilities",
  usage: ".otp",
  cooldown: 30,

  async run({ sock, msg, sender }) {
    const chatId = msg.key.remoteJid;
    try {
      const websiteId = await getOrCreateWebsiteId(sender);
      const code = await generateOtp(websiteId);
      await sock.sendMessage(chatId, {
        text: [
          "🔐 *AIDORU PASSWORD RESET CODE*",
          "",
          `AIDORU ID: *${websiteId}*`,
          `One-time code: *${code}*`,
          "",
          "Enter this six-digit code on the AIDORU website within 10 minutes.",
          "If you did not request a reset, ignore this message and never share the code.",
        ].join("\n"),
      }, { quoted: msg });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create a reset code.";
      await sock.sendMessage(chatId, { text: `❌ ${message}` }, { quoted: msg });
    }
  },
};

