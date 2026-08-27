/**
 * KELIN MD — .quest command
 * RPG daily quests.
 */

import { getRpgUser, saveRpgUser } from "./db.js";

const QUESTS = [
  { name: "Slime Slayer", goal: 5, reward: 500, type: "hunt" },
  { name: "Dungeon Crawler", goal: 1, reward: 1000, type: "dungeon" },
  { name: "Rich Merchant", goal: 2000, reward: 300, type: "money" },
  { name: "Level Grinder", goal: 100, reward: 800, type: "xp" }
];

export default {
  name: "quest",
  description: "View or claim RPG quests",
  category: "rpg",
  usage: ".quest",
  cooldown: 5,

  async run({ sock, msg, sender }) {
    const jid = msg.key.remoteJid;
    const user = await getRpgUser(sender);
    
    if (!user.registered) {
      return sock.sendMessage(jid, { text: "❌ Start your RPG journey with *.startrpg* first!" }, { quoted: msg });
    }

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    
    if (!user.lastQuest || now - user.lastQuest > day) {
      // Assign new quest
      const quest = QUESTS[Math.floor(Math.random() * QUESTS.length)];
      user.activeQuest = { ...quest, progress: 0 };
      user.lastQuest = now;
      await saveRpgUser(sender, user);
    }

    const q = user.activeQuest;
    if (!q) {
      return sock.sendMessage(jid, { text: "✅ You have completed all quests for today! Come back tomorrow." }, { quoted: msg });
    }

    const caption = `📜 *RPG DAILY QUEST* 📜\n\n` +
      `✨ *Quest:* ${q.name}\n` +
      `🎯 *Goal:* ${q.goal} ${q.type}\n` +
      `📈 *Progress:* ${q.progress}/${q.goal}\n` +
      `💰 *Reward:* ${q.reward} Gold\n\n` +
      `Use RPG commands to complete your quest!`;

    await sock.sendMessage(jid, { text: caption }, { quoted: msg });
  }
};
