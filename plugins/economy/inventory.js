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
        text:
`꧁━━〔 🎒 *I N V E N T O R Y* 〕━━꧂

  ⚠️ *Your bag is empty!*

  Go shopping, warrior! 🏯
  *.shop buy <item>*

꧂━━━━━━━━━━━━━━━━━━━━━━꧁`
      }, { quoted: msg });
    }

    const count = {};
    inv.forEach(item => { count[item] = (count[item] || 0) + 1; });

    const list = Object.entries(count)
      .map(([item, qty]) => `  ⚜️ *${item}*  ×*${qty}*`)
      .join("\n");

    await sock.sendMessage(msg.key.remoteJid, {
      text:
`꧁━━〔 🎒 *I N V E N T O R Y* 〕━━꧂

${list}

  ━━━━━━━━━━━━━━━━━━━━━━━
  📦 *Total: ${inv.length} item${inv.length !== 1 ? "s" : ""}*

꧂━━━━━━━━━━━━━━━━━━━━━━꧁`
    }, { quoted: msg });
  }
};
