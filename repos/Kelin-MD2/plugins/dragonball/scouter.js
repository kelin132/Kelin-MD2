import { getUser } from "../economy/database.js";

export default {
  name: "scouter",
  aliases: ["powerlevel", "checkpower"],
  category: "dragonball",
  description: "Check a user's power level",
  usage: ".scouter [@user]",

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
    
    const target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || 
                   (args[0]?.endsWith("@s.whatsapp.net") ? args[0] : sender);
    
    try {
      const user = await getUser(target);
      const name = user.name || "Unknown Warrior";
      
      // Calculate power level based on level and money
      const basePower = (user.level || 1) * 1000;
      const wealthBonus = Math.floor(Math.sqrt(user.money || 0) * 10);
      const totalPower = basePower + wealthBonus + Math.floor(Math.random() * 500);
      
      let rank = "Low-Class Warrior";
      if (totalPower > 1000000) rank = "God of Destruction";
      else if (totalPower > 500000) rank = "Super Saiyan Blue";
      else if (totalPower > 100000) rank = "Super Saiyan";
      else if (totalPower > 50000) rank = "Elite Warrior";
      
      const text = `
📟 *SCOUTER READING* 📟
━━━━━━━━━━━━━━━━━━━━━
👤 *Target:* ${name}
📊 *Power Level:* ${totalPower.toLocaleString()}
🎖️ *Rank:* ${rank}
━━━━━━━━━━━━━━━━━━━━━
_"It's over 9,000!"_
`;

      return reply(text);

    } catch (err) {
      console.error(err);
      return reply("❌ Failed to read power level.");
    }
  },
};
