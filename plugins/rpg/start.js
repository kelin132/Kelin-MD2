import { getRpgUser, createRpgUser, CLASSES } from "./db.js";

export default {
  name: "rpg-start",
  aliases: ["rpgstart", "startrpg"],
  category: "rpg",
  description: "Start your RPG journey and pick a class",
  usage: ".rpg-start <warrior|mage|rogue>",

  async run({ sock, msg, args, sender, pushName }) {
    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      const existing = await getRpgUser(sender);
      if (existing) {
        return reply(`❌ You have already started your journey as a *${existing.class}*!\nUse *.rpg-profile* to see your stats.`);
      }

      const choice = (args[0] || "").toLowerCase();
      if (!CLASSES[choice]) {
        let text = "🎮 *WELCOME TO THE KELIN RPG* 🎮\n\nPick a class to begin your adventure:\n\n";
        for (const [key, c] of Object.entries(CLASSES)) {
          text += `${c.emoji} *${c.name}*\n`;
          text += `   HP: ${c.hp} | ATK: ${c.atk} | DEF: ${c.def}\n`;
          text += `   Usage: *.rpg-start ${key}*\n\n`;
        }
        return reply(text);
      }

      const user = await createRpgUser(sender, choice, pushName);
      return reply(`✨ *JOURNEY BEGUN!* ✨\n\nWelcome, *${pushName}* the *${user.class}*!\n\nYou have been gifted 100 Gold and basic stats.\n\n🏹 *Next Steps:*\n- *.rpg-profile* : View your stats\n- *.rpg-hunt* : Fight monsters for XP & Gold\n- *.rpg-shop* : Buy better gear`);

    } catch (err) {
      console.error("RPG START ERROR:", err);
      return reply("❌ Failed to start RPG journey.");
    }
  },
};
