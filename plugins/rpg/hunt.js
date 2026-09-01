import { addXp, advanceQuest, getRpgUser } from "./db.js";

const MONSTERS = [
  { name: "Slime", hp: 30, atk: 5, xp: 10, gold: 20, emoji: "💧" },
  { name: "Goblin", hp: 50, atk: 10, xp: 25, gold: 50, emoji: "👺" },
  { name: "Skeleton", hp: 70, atk: 15, xp: 40, gold: 80, emoji: "💀" },
  { name: "Orc", hp: 120, atk: 25, xp: 100, gold: 200, emoji: "👹" },
  { name: "Dragon Kin", hp: 250, atk: 45, xp: 500, gold: 1000, emoji: "🐉" },
];

export default {
  name: "rpg-hunt",
  aliases: ["hunt", "rpghunt"],
  category: "rpg",
  description: "Hunt monsters for XP and Gold",
  usage: ".rpg-hunt",
  cooldown: 30,

  async run({ sock, msg, sender }) {
    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      const user = await getRpgUser(sender);
      if (!user) return reply("❌ You haven't started your RPG journey yet!\nUse *.rpg-start* to begin.");

      const now = Date.now();
      const cooldown = 30000; // 30 seconds
      if (now - (user.lastHunt || 0) < cooldown) {
        const remaining = Math.ceil((cooldown - (now - user.lastHunt)) / 1000);
        return reply(`⏳ Your character is resting. Please wait *${remaining}s* before hunting again.`);
      }

      // Pick monster based on level
      const levelFactor = Math.floor(user.level / 5);
      const possibleMonsters = MONSTERS.slice(0, Math.min(MONSTERS.length, levelFactor + 2));
      const monster = { ...possibleMonsters[Math.floor(Math.random() * possibleMonsters.length)] };
      
      // Scaling monster stats
      monster.hp += user.level * 5;
      monster.atk += user.level * 2;

      let log = `⚔️ *BATTLE: ${user.username} vs ${monster.emoji} ${monster.name}* ⚔️\n\n`;
      let userHp = user.hp;
      let monsterHp = monster.hp;
      let rounds = 0;

      while (userHp > 0 && monsterHp > 0 && rounds < 10) {
        rounds++;
        // User attacks
        const userDmg = Math.max(1, user.atk - Math.floor(Math.random() * 5));
        monsterHp -= userDmg;
        log += `💥 You dealt *${userDmg}* damage!\n`;
        
        if (monsterHp <= 0) break;

        // Monster attacks
        const monsterDmg = Math.max(1, monster.atk - user.def);
        userHp -= monsterDmg;
        log += `${monster.emoji} Monster dealt *${monsterDmg}* damage!\n`;
      }

      user.lastHunt = now;
      
      if (userHp > 0) {
        const xpGained = monster.xp + (user.level * 5);
        const goldGained = monster.gold + (user.level * 10);
        user.gold += goldGained;
        advanceQuest(user, "hunt", 1);
        advanceQuest(user, "xp", xpGained);
        advanceQuest(user, "money", goldGained);
        
        log += `\n🏆 *VICTORY!* 🏆\n`;
        log += `✨ XP: +${xpGained}\n`;
        log += `💰 Gold: +${goldGained}\n`;

        const levels = addXp(user, xpGained);
        if (levels > 0) {
          log += `\n🎊 *LEVEL UP!* 🎊\nYou are now *Level ${user.level}* (+${levels} level${levels === 1 ? "" : "s"})!\nStats increased!`;
        }
      } else {
        log += `\n💀 *DEFEAT...*\nYou were knocked out by the ${monster.name}. No rewards gained.`;
        user.hp = Math.floor(user.maxHp * 0.1); // revive with 10% HP
      }

      await user.save();
      return reply(log);

    } catch (err) {
      console.error("RPG HUNT ERROR:", err);
      return reply("❌ Failed to hunt.");
    }
  },
};
