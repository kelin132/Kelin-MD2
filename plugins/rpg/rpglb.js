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

      // Prefer the current WhatsApp group display name when available. This
      // also repairs old RPG records that were created before pushName was
      // passed into the RPG start command.
      const participantNames = new Map();
      if (jid.endsWith("@g.us")) {
        try {
          const metadata = await sock.groupMetadata(jid);
          for (const participant of metadata.participants || []) {
            const displayName = participant.notify || participant.name || participant.pushName;
            if (displayName) participantNames.set(normalizeJid(participant.id), displayName);
          }
        } catch {
          // Stored RPG usernames remain a valid fallback if group metadata is unavailable.
        }
      }
      
      let text = `🏆 *RPG LEADERBOARD* 🏆\n\n`;
      
      for (let i = 0; i < topPlayers.length; i++) {
        const p = topPlayers[i];
        const name =
          participantNames.get(normalizeJid(p._id)) ||
          p.username ||
          p.name ||
          "Unknown Trainer";
        text += `${i + 1}. *${name}* — Lvl ${p.level} (${p.xp} XP)\n`;
      }
      
      text += `\n🛡️ Use *.rpg start* to join the journey!`;
      
      return sock.sendMessage(jid, { text }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ ${err.message}` }, { quoted: msg });
    }
  }
};
