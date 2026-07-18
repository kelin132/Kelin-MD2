export default {
  name: "ytmp3",
  description: "Download YouTube audio as MP3",
  category: "download",
  usage: ".ytmp3 <url>",
  aliases: ["ymp3"],
  cooldown: 30,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg, args }) {
    const url = args[0];
    if (!url || !url.includes("youtu")) {
      await sock.sendMessage(msg.key.remoteJid, { text: "Usage: .ytmp3 <YouTube URL>" });
      return;
    }
    await sock.sendMessage(msg.key.remoteJid, { text: "Downloading audio... (stub)" });
  },
};
