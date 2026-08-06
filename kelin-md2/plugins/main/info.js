export default {
  name: "info",
  description: "Display bot information",
  category: "main",
  usage: ".info",
  aliases: ["botinfo"],
  cooldown: 10,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg }) {
    const text = `*AKIRA MD — Bot Info* ⚡\n\n*Name:* KELIN MD\n*Version:* 2.0.0\n*Language:* Node.js (ESM)\n*Library:* @whiskeysockets/baileys\n*Developer:* Kelin\n*Platform:* WhatsApp Multi-Device\n\n© KELIN MD`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },
};
