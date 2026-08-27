/**
 * KELIN MD — .rpglb command
 * Shows the top RPG players.
 */
import { getDb } from "../../lib/mongo.mjs";

export default {
  name: "rpglb",
  description: "Show RPG leaderboard",
  category: "rpg",
  usage: ".rpglb",
  aliases: ["rpgleaderboard"],
  cooldown: 10,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    
    try {
      const db = await getDb();
      const topPlayers = await db.collection("rpg_users")
        .find({})
        .sort({ level: -1, xp: -1 })
        .limit(10)
        .toArray();
        
      if (!topPlayers.length) {
        return sock.sendMessage(jid, { text: "🛡️ No RPG players yet. Be the first with *.rpg start*!" }, { quoted: msg });
      }
      
      let text = `🏆 *RPG LEADERBOARD* 🏆\n\n`;
      
      for (let i = 0; i < topPlayers.length; i++) {
        const p = topPlayers[i];
        const name = p.name || "Unknown Trainer";
        text += `${i + 1}. *${name}* — Lvl ${p.level} (${p.xp} XP)\n`;
      }
      
      text += `\n🛡️ Use *.rpg start* to join the journey!`;
      
      return sock.sendMessage(jid, { text }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ ${err.message}` }, { quoted: msg });
    }
  }
};
