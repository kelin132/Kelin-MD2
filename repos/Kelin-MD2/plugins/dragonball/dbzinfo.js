/**
 * KELIN MD — .dbzinfo command
 * Shows info about Dragon Ball Z characters.
 */

export default {
  name: "dbzinfo",
  description: "Get information about Dragon Ball Z characters",
  category: "dragonball",
  usage: ".dbzinfo <character name>",
  aliases: ["dbzi", "dragonballinfo"],
  cooldown: 5,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;

    if (!text) {
      return sock.sendMessage(jid, {
        text: "🐉 *Dragon Ball Z Info*\n\nUsage: *.dbzinfo <character name>*\nExample: *.dbzinfo Goku*"
      }, { quoted: msg });
    }

    const query = text.trim();
    
    try {
      await sock.sendMessage(jid, { react: { text: "🔍", key: msg.key } });
      
      const res = await fetch(`https://api.omegatech.app/api/Search/wiki?query=${encodeURIComponent(query + " dragon ball")}`);
      const json = await res.json();
      
      if (!json.success || !json.data) {
         throw new Error("Character not found.");
      }
      
      const info = json.data;
      const caption = `🐉 *DRAGON BALL INFO: ${info.title}*\n\n${info.extract}\n\n🔗 *More:* ${info.url}`;
      
      if (info.thumbnail) {
        await sock.sendMessage(jid, { image: { url: info.thumbnail }, caption }, { quoted: msg });
      } else {
        await sock.sendMessage(jid, { text: caption }, { quoted: msg });
      }
      
      await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ ${err.message}` }, { quoted: msg });
    }
  }
};
