import { getUser, requireRegistration } from "./database.js";

export default {
  name: "inventory",
  description: "Check your inventory",
  category: "economy",
  usage: ".inventory",
  aliases: ["inv", "items"],
  cooldown: 6,

  async run({ sock, msg, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const user = await getUser(sender);
    const inv  = user.inventory || [];

    if (inv.length === 0) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: [
          "🎒 Inventory",
          "",
          "Your bag is empty.",
          "Use *.shop buy <item>* to get started.",
        ].join("\n"),
      }, { quoted: msg });
    }

    const count = {};
    inv.forEach(item => { count[item] = (count[item] || 0) + 1; });

    const list = Object.entries(count)
      .map(([item, qty]) => `• ${item}: \`${qty}\``)
      .join("\n");

    await sock.sendMessage(msg.key.remoteJid, {
      text: [
        `🎒 Inventory — ${user.name || "User"}`,
        "",
        list,
        "",
        `Total items: \`${inv.length}\``,
      ].join("\n"),
    }, { quoted: msg });
  }
};
