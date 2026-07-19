import { guildSystem } from "../../lib/guildSystem.js";
import { getUser, saveUser, requireRegistration } from "./database.js";

export default {
  name: "guildtax",
  description: "Donate money to your guild treasury",
  category: "guild",
  usage: ".guildtax <guild_name> <amount>",
  aliases: ["donate", "gdonate"],
  cooldown: 5,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    if (!args[0] || !args[1]) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ Usage: *.guildtax <guild_name> <amount>*\n\nExample: .guildtax MyGuild 1000"
      }, { quoted: msg });
    }

    const guildName = args[0];
    const amount    = parseInt(args[1]);

    if (isNaN(amount) || amount <= 0) {
      return sock.sendMessage(msg.key.remoteJid, { text: "❌ Enter a valid amount." }, { quoted: msg });
    }

    const guild = await guildSystem.getGuild(guildName);

    if (!guild) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `❌ Guild "${guildName}" not found.`
      }, { quoted: msg });
    }

    if (!guild.members.includes(sender)) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ You are not a member of this guild!"
      }, { quoted: msg });
    }

    const user = await getUser(sender);
    if (user.money < amount) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `❌ Insufficient funds! You have $${user.money.toLocaleString()}`
      }, { quoted: msg });
    }

    user.money -= amount;
    await saveUser(sender, user);
    const newTreasury = await guildSystem.addTreasury(guildName, amount);

    await sock.sendMessage(msg.key.remoteJid, {
      text: `✅ *Donation Successful!*\n\n⚔️ Guild     : ${guildName}\n💰 Donated  : $${amount.toLocaleString()}\n🏛️ Treasury : $${newTreasury.toLocaleString()}\n💵 Balance  : $${user.money.toLocaleString()}`
    }, { quoted: msg });
  }
};
