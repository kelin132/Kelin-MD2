export default {
  name: "qr",
  description: "Generate a QR code for text or URL",
  category: "media",
  usage: ".qr <text>",
  aliases: ["qrcode"],
  cooldown: 10,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg, text }) {
    if (!text) {
      await sock.sendMessage(msg.key.remoteJid, { text: "Usage: .qr <text or URL>" });
      return;
    }
    await sock.sendMessage(msg.key.remoteJid, {
      text: `QR generation for: "${text}" — install qrcode npm package to enable.`,
    });
  },
};
