export default {
  name: "ytdl",
  description: "Download YouTube video",
  category: "download",
  usage: ".ytdl <url>",
  aliases: ["yt", "youtube"],
  cooldown: 30,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg, args }) {
    const url = args[0];
    if (!url || !url.includes("youtu")) {
      await sock.sendMessage(msg.key.remoteJid, { text: "Usage: .ytdl <YouTube URL>" });
      return;
    }
    await sock.sendMessage(msg.key.remoteJid, {
      text: "YouTube download requires ytdl-core. Install via: npm i ytdl-core",
    });
  },
};
