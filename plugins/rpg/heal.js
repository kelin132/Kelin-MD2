/**
 * KELIN MD — .heal command
 * RPG health restoration.
 */

import { getRpgUser, saveRpgUser } from "./db.js";

export default {
  name: "heal",
  description: "Heal your RPG character",
  category: "rpg",
  usage: ".heal",
  cooldown: 10,

  async run({ sock, msg, sender }) {
    const jid = msg.key.remoteJid;
    const user = await getRpgUser(sender);
    
    if (!user) {
      return sock.sendMessage(jid, { text: "❌ You haven't started your RPG journey yet! Use *.rpg-start* to begin." }, { quoted: msg });
    }

    if (user.hp >= user.maxHp) {
      return sock.sendMessage(jid, { text: "💚 You are already at full health!" }, { quoted: msg });
    }

    const potionCost = 100;
    if ((user.gold || 0) < potionCost) {
      return sock.sendMessage(jid, { text: `❌ You need ${potionCost} Gold to buy a healing potion.` }, { quoted: msg });
    }

    user.gold = (user.gold || 0) - potionCost;
    user.hp = user.maxHp;
    await saveRpgUser(sender, user);

    await sock.sendMessage(jid, {
      text: `🧪 *HEALED!* 🧪\n\nYou used a potion for *${potionCost} Gold*.\n💖 HP: *${user.hp}/${user.maxHp}*`
    }, { quoted: msg });
  }
};
