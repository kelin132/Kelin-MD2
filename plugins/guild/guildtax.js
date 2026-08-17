import { guildSystem, guildTaxRate } from "../../lib/guildSystem.js";
import { getUser, saveUser, requireRegistration } from "./database.js";

function taxFloor(level) {
  return Math.max(250, Number(level || 1) * 250);
}

export default {
  name: "guildtax",
  description: "Contribute level-scaled tax money to your guild treasury",
  category: "guild",
  usage: ".guildtax <guild_name> [amount]",
  aliases: ["donate", "gdonate"],
  cooldown: 5,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    if (!args[0]) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ Usage: *.guildtax <guild_name> [amount]*\n\nLeave amount empty to contribute the level-scaled recommended tax.",
      }, { quoted: msg });
    }

    const guildName = args[0];
    const guild = await guildSystem.getGuild(guildName);

    if (!guild) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `❌ Guild "${guildName}" not found.`,
      }, { quoted: msg });
    }

    const members = Array.isArray(guild.members) ? guild.members : [];
    if (!members.includes(sender)) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ You are not a member of this guild!",
      }, { quoted: msg });
    }

    const level = Math.max(1, Number(guild.level) || 1);
    const rate = guildTaxRate(level);
    const minimum = taxFloor(level);
    const recommended = minimum * 2;
    const parsed = args[1] === undefined ? recommended : Number.parseInt(args[1], 10);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      return sock.sendMessage(msg.key.remoteJid, { text: "❌ Enter a valid amount." }, { quoted: msg });
    }
    if (parsed < minimum) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `❌ *Guild Lv.${level} contribution is too low.*\n\n🧾 Tax floor   : $${minimum.toLocaleString()}\n💡 Recommended : $${recommended.toLocaleString()}\n📈 Guild rate  : ${(rate * 100).toFixed(0)}%\n\nUse *.guildtax ${guildName} ${minimum}* or a larger amount.`,
      }, { quoted: msg });
    }

    const user = await getUser(sender);
    if (user.money < parsed) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `❌ Insufficient funds! You have $${user.money.toLocaleString()} but this contribution needs $${parsed.toLocaleString()}.`,
      }, { quoted: msg });
    }

    user.money -= parsed;
    await saveUser(sender, user);
    const newTreasury = await guildSystem.addTreasury(guildName, parsed);
    const updatedGuild = await guildSystem.getGuild(guildName);
    const gainedXp = Math.max(1, Math.floor(parsed / 25));

    await sock.sendMessage(msg.key.remoteJid, {
      text: `╭─〔 🧾 *GUILD TAX PAID* 〕\n│\n│ ⚔️ Guild     : ${guildName}\n│ 🏯 Level     : ${level}\n│ 💸 Paid      : $${parsed.toLocaleString()}\n│ 🧾 Guild rate: ${(rate * 100).toFixed(0)}%\n│ ⭐ Guild XP   : +${gainedXp.toLocaleString()}\n│ 🏛️ Treasury  : $${newTreasury.toLocaleString()}\n│ 💰 Balance   : $${user.money.toLocaleString()}\n│\n│ Upgrade progress: ${Number(updatedGuild?.guildXp || 0).toLocaleString()} guild XP\n└───────────────◆`,
    }, { quoted: msg });
  },
};
