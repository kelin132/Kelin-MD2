import { advanceQuest, getRpgUser } from "./db.js";

const DUNGEONS = [
  { name: "Dark Cave", minLevel: 5, bosses: ["Giant Bat", "Spider Queen"], gold: 500, xp: 200, emoji: "🕳️" },
  { name: "Ancient Ruins", minLevel: 15, bosses: ["Stone Golem", "Cursed King"], gold: 2000, xp: 800, emoji: "🏛️" },
  { name: "Dragon's Lair", minLevel: 30, bosses: ["Inferno Drake", "Ancient Dragon"], gold: 10000, xp: 5000, emoji: "🌋" },
];

export default {
  name: "rpg-dungeon",
  aliases: ["dungeon"],
  category: "rpg",
  description: "Enter dangerous dungeons for massive rewards",
  usage: ".rpg-dungeon [dungeon_name]",
  cooldown: 300, // 5 minutes

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      const user = await getRpgUser(sender);
      if (!user) return reply("❌ You haven't started your RPG journey yet!");

      const now = Date.now();
      const cooldown = 300000;
      if (now - (user.lastDungeon || 0) < cooldown) {
        const remaining = Math.ceil((cooldown - (now - user.lastDungeon)) / 60000);
        return reply(`⏳ Your character is exhausted. Please wait *${remaining}m* before entering another dungeon.`);
      }

      const choice = (args.join(" ") || "").toLowerCase();
      const dungeon = DUNGEONS.find(d => d.name.toLowerCase() === choice);

      if (!dungeon) {
        let text = "🏰 *AVAILABLE DUNGEONS* 🏰\n\n";
        for (const d of DUNGEONS) {
          text += `${d.emoji} *${d.name}*\n`;
          text += `   Min Level: ${d.minLevel}\n`;
          text += `   Rewards: Up to ${d.gold} Gold\n`;
          text += `   Usage: \`.rpg-dungeon ${d.name}\`\n\n`;
        }
        return reply(text);
      }

      if (user.level < dungeon.minLevel) {
        return reply(`❌ You are too weak for this dungeon! You need to be at least *Level ${dungeon.minLevel}*.`);
      }

      const boss = dungeon.bosses[Math.floor(Math.random() * dungeon.bosses.length)];
      const winChance = 0.4 + (user.level - dungeon.minLevel) * 0.02;
      const success = Math.random() < Math.min(0.9, winChance);

      user.lastDungeon = now;
      
      if (success) {
        const gold = Math.floor(dungeon.gold * (0.8 + Math.random() * 0.4));
        const xp = Math.floor(dungeon.xp * (0.8 + Math.random() * 0.4));
        user.gold += gold;
        user.xp += xp;
        advanceQuest(user, "dungeon", 1);
        advanceQuest(user, "xp", xp);
        advanceQuest(user, "money", gold);
        
        await user.save();
        return reply(`🎊 *DUNGEON CLEARED!* 🎊\n\nYou defeated the *${boss}* in the *${dungeon.name}*!\n\n✨ XP: +${xp}\n💰 Gold: +${gold}`);
      } else {
        const penalty = Math.floor(user.gold * 0.1);
        user.gold -= penalty;
        user.hp = 1;
        
        await user.save();
        return reply(`💀 *DUNGEON FAILED* 💀\n\nThe *${boss}* was too strong. You barely escaped with your life.\n\n❤️ HP: 1\n💰 Gold Lost: -${penalty}`);
      }

    } catch (err) {
      console.error("RPG DUNGEON ERROR:", err);
      return reply("❌ Failed to enter dungeon.");
    }
  },
};
