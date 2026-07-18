export default {
  name: "sticker",
  description: "Convert image/video to sticker",
  category: "media",
  usage: ".sticker (reply to image/video)",
  aliases: ["s", "stik"],
  cooldown: 5,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg }) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted?.imageMessage && !quoted?.videoMessage) {
      await sock.sendMessage(msg.key.remoteJid, {
        text: "Reply to an image or video with .sticker",
      });
      return;
    }
    await sock.sendMessage(msg.key.remoteJid, {
      text: "Sticker creation requires @ffmpeg/ffmpeg. Install it to enable this feature.",
    });
  },
};
