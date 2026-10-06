/**
 * KELIN MD — .lb
 * Live Money Leaderboard Command
 */
import { getDb } from "../../lib/mongo.mjs";

const formatMoney = (value) => `$${Number(value || 0).toLocaleString()}`;

function getMedal(index) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return `${index + 1}.`;
}

// Safely converts database values (strings, nulls, objects) to valid numbers
function parseAmount(val) {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (typeof val === "string") {
    const cleaned = val.replace(/[^0-9.-]/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export default {
  name: "lb",
  description: "View top richest players by actual money",
  category: "economy",
  usage: ".lb",
  aliases: ["kb", "leaderboard", "wealthlb"],
  cooldown: 8,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      const db = await getDb();

      // 1. Fetch registered users with balance fields
      const users = await db.collection("users").find(
        { registered: true },
        { 
          projection: { 
            _id: 1, 
            name: 1, 
            username: 1, 
            wallet: 1, 
            bank: 1, 
            balance: 1, 
            money: 1, 
            totalWealth: 1 
          } 
        }
      ).toArray();

      if (!users.length) {
        return reply([
          "ㅤㅤ∘]───❀───[∘",
          "*∘₊✧ WEALTH RANKINGS* ❀",
          "      ∘]───❀───[∘",
          "",
          "━━━━━━━━━━━━━━━",
          "💰 No registered players yet!",
          "━━━━━━━━━━━━━━━",
          "_Earn money to join_",
        ].join("\n"));
      }

      // 2. Calculate actual real-time money for every user
      const leaderboardData = users.map((user) => {
        const wallet = parseAmount(user.wallet || user.balance || user.money);
        const bank = parseAmount(user.bank);
        
        // Sum wallet + bank (or fall back to totalWealth if both are 0)
        let actualMoney = wallet + bank;
        if (actualMoney === 0 && user.totalWealth) {
          actualMoney = parseAmount(user.totalWealth);
        }

        const userJid = String(user._id || user.jid || "");
        const cleanId = userJid.split("@")[0].split(":")[0];
        const name = String(user.name || user.username || `User_${cleanId.slice(-4)}`).trim();

        return { name, money: actualMoney };
      });

      // 3. Sort by actual money descending and take top 10
      const top10 = leaderboardData
        .sort((a, b) => b.money - a.money)
        .slice(0, 10);

      // 4. Build output rows
      const rows = top10.map((user, index) => {
        const medal = getMedal(index);
        return [
          `${medal} *${user.name}*`,
          `💰 Wealth: ${formatMoney(user.money)}`,
        ].join("\n");
      });

      const response = [
        "ㅤㅤ∘]───❀───[∘",
        "*∘₊✧ WEALTH RANKINGS* ❀",
        "      ∘]───❀───[∘",
        "",
        "━━━━━━━━━━━━━━━",
        rows.join("\n\n"),
        "━━━━━━━━━━━━━━━",
        "_May your wealth grow like the sakura_",
      ].join("\n");

      return reply(response);
    } catch (error) {
      console.error("LEADERBOARD ERROR:", error);
      return reply("❌ Failed to load leaderboard.");
    }
  },
};
