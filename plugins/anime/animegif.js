import axios from "axios";

const CATEGORIES = ["happy", "sad", "angry", "dance", "hug", "kiss", "punch", "slap", "cry", "blush"];

export default {
  name: "animegif",
  aliases: ["agif", "animatedgif"],
  description: "Send a random anime GIF by category",
  category: "anime",
  usage: ".animegif [happy|sad|angry|dance|hug|kiss|punch|slap|cry|blush]",
  cooldown: 5,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;
    const cat = text?.toLowerCase();
    const category = CATEGORIES.includes(cat) ? cat : CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

    try {
      const { data } = await axios.get(`https://nekos.best/api/v2/${category}`);
      if (!data.results?.length) throw new Error("No results");
      await sock.sendMessage(jid, {
        video: { url: data.results[0].url },
        caption: `🎬 *${category.toUpperCase()} anime gif*`,
        gifPlayback: true,
      }, { quoted: msg });
    } catch (err) {
      console.error(err);
      await sock.sendMessage(jid, { text: `❌ Couldn't fetch a ${category} gif. Try again!` }, { quoted: msg });
    }
  },
};
