import { generateOtp, getOrCreateWebsiteId } from "../../lib/websiteAuth.mjs";

export default {
  name: "otp",
  description: "Send a one-time AIDORU password reset code",
  category: "utilities",
  usage: ".otp",
  cooldown: 30,

  async run({ sock, msg, sender }) {
    // In a group, pluginManager resolves sender from msg.key.participant. In a
    // direct chat it falls back to msg.key.remoteJid. Always use that sender
    // JID for identity lookup and delivery; never send the OTP to the group.
    const senderJid = String(sender || msg.key.participant || msg.key.remoteJid || "").trim();
    const sourceChat = msg.key.remoteJid;
    const deliveryJid = senderJid;
    const quoted = deliveryJid === sourceChat ? { quoted: msg } : undefined;

    if (!deliveryJid || deliveryJid.endsWith("@g.us")) return;

    try {
      const websiteId = await getOrCreateWebsiteId(deliveryJid);
      const code = await generateOtp(websiteId);
      await sock.sendMessage(deliveryJid, {
        text: [
          "🔐 *AIDORU PASSWORD RESET CODE*",
          "",
          `AIDORU ID: *${websiteId}*`,
          `One-time code: *${code}*`,
          "",
          "Enter this six-digit code on the AIDORU website within 10 minutes.",
          "If you did not request a reset, ignore this message and never share the code.",
        ].join("\n"),
      }, quoted);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create a reset code.";
      await sock.sendMessage(deliveryJid, { text: `❌ ${message}` }, quoted);
    }
  },
};
