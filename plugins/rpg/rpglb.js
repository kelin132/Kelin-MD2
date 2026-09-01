/**
 * KELIN MD — .rpglb command
 * Shows the top RPG players.
 */
import { getDb } from "../../lib/mongo.mjs";
import { normalizeJid } from "../../lib/identity.mjs";

export default {
  name: "rpglb",
  description: "Show RPG leaderboard",
  category: "rpg",
  usage: ".rpglb",
  aliases: ["rpgleaderboard"],
  cooldown: 10,

  async run({ sock, msg, args, sender }) {
    const jid = msg.key.remoteJid;
    
    try {
      const db = await getDb();
      const requested = Number.parseInt(args?.[0] || "10", 10);
      const limit = Math.min(20, Math.max(5, Number.isFinite(requested) ? requested : 10));
      const topPlayers = await db.collection("rpg_users")
        .find({})
        .sort({ level: -1, xp: -1 })
        .limit(limit)
        .toArray();
        
      if (!topPlayers.length) {
        return sock.sendMessage(jid, { text: "🛡️ No RPG players yet. Be the first with *.rpg-start warrior*!" }, { quoted: msg });
      }

      let text = `🏆 *RPG LEADERBOARD* 🏆\n\n`;
      
      for (let i = 0; i < topPlayers.length; i++) {
        const p = topPlayers[i];
        const name = p.username || p.name || "Unknown Hero";
        const className = p.class ? ` ${p.class}` : "";
        text += `${i + 1}. *${name}* — Lv.${p.level}${className} · ${p.xp} XP · ${Number(p.gold || 0).toLocaleString()} Gold\n`;
      }
      
      const me = await db.collection("rpg_users").findOne(
        { _id: normalizeJid(sender) },
        { projection: { level: 1, xp: 1 } },
      ).catch(() => null);
      const rank = me ? await db.collection("rpg_users").countDocuments({
        $or: [
          { level: { $gt: Number(me.level) || 1 } },
          { level: Number(me.level) || 1, xp: { $gt: Number(me.xp) || 0 } },
        ],
      }).catch(() => null) : null;
      text += `\n🛡️ Use *.rpg-start warrior* to join the journey!`;
      if (rank !== null) text += `\n📍 Your position: #${rank + 1}`;
      
      return sock.sendMessage(jid, { text }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ ${err.message}` }, { quoted: msg });
    }
  }
};
