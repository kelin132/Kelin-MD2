import { getRpgUser, CLASSES } from "./db.js";

export default {
  name: "rpg-profile",
  aliases: ["rpgp", "rp"],
  category: "rpg",
  description: "View your RPG character profile",
  usage: ".rpg-profile",

  async run({ sock, msg, sender }) {
    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      const user = await getRpgUser(sender);
      if (!user) return reply("❌ You haven't started your RPG journey yet!\nUse *.rpg-start* to begin.");

      const xpNeeded = user.level * 100;
      const progress = Math.floor((user.xp / xpNeeded) * 10);
      const bar = "🟩".repeat(progress) + "⬜".repeat(10 - progress);

      const charClass = Object.values(CLASSES).find(c => c.name === user.class) || CLASSES.warrior;

      const text = 
`👤 *RPG CHARACTER PROFILE* 👤
━━━━━━━━━━━━━━━━━━━━━
🌟 *Name:* ${user.username}
🛡️ *Class:* ${charClass.emoji} ${user.class}
📊 *Level:* ${user.level}
✨ *XP:* ${user.xp} / ${xpNeeded}
[${bar}]

❤️ *HP:* ${user.hp} / ${user.maxHp}
⚔️ *ATK:* ${user.atk}
🛡️ *DEF:* ${user.def}
⚡ *SPD:* ${user.speed}

💰 *Gold:* ${user.gold.toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━
🗡️ *Equipment:*
• Weapon: ${user.equipment.weapon || "_None_"}
• Armor: ${user.equipment.armor || "_None_"}

🎒 *Inventory:* ${user.inventory.length ? user.inventory.join(", ") : "_Empty_"}
━━━━━━━━━━━━━━━━━━━━━
💡 _Use .rpg-hunt to grow stronger!_
🌐 _Edit your profile at:_
_https://aidoru.zone.id/profile_`;

      return reply(text);

    } catch (err) {
      console.error("RPG PROFILE ERROR:", err);
      return reply("❌ Failed to load RPG profile.");
    }
  },
};
