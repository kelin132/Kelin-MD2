import { getUser, requireRegistration } from "./database.js";

export default {
  name: "profile",
  description: "View your economy profile",
  category: "economy",
  usage: ".profile",
  aliases: ["me", "acc", "account"],
  cooldown: 5,

  async run({ sock, msg, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const user = await getUser(sender);
    const net  = user.money + user.bank;
    const tag  = sender.split("@")[0];

    const invCount = user.inventory?.length || 0;
    const joined   = user.registeredAt
      ? new Date(user.registeredAt).toLocaleDateString()
      : "Unknown";

    await sock.sendMessage(msg.key.remoteJid, {
      text:
`╭━━━〔 👤 PROFILE 〕━━━╮

  👤 Name    : ${user.name || "User"}
  📱 Number  : @${tag}
  📅 Joined  : ${joined}

  💰 Wallet  : $${user.money.toLocaleString()}
  🏦 Bank    : $${user.bank.toLocaleString()}
  💎 Net Worth: $${net.toLocaleString()}

  ⭐ Level   : ${user.level}
  🔮 XP      : ${user.xp}
  🎒 Items   : ${invCount}
  ⛓️ Jailed  : ${user.jail ? "Yes 🔒" : "No ✅"}

╰━━━━━━━━━━━━━━━━━━╯`,
      mentions: [sender]
    }, { quoted: msg });
  }
};
