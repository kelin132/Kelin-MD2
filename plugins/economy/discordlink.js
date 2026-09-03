import { isRegistered } from "./database.js";
import { createWhatsAppLinkCode } from "../../lib/accountLink.mjs";
import { getDatabaseId } from "../../lib/identity.mjs";

export default {
  name: "discord",
  description: "Generate a one-time code for linking your WhatsApp progress to Discord",
  category: "economy",
  usage: ".discord",
  aliases: ["linkdiscord"],
  cooldown: 10,

  async run({ sock, msg, sender }) {
    const whatsappId = await getDatabaseId(sender, sock, msg.key.remoteJid);
    if (!await isRegistered(whatsappId)) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ Register first with *.register <your_name>*, then generate a Discord link code.",
      }, { quoted: msg });
    }

    const { code } = await createWhatsAppLinkCode(whatsappId);
    return sock.sendMessage(msg.key.remoteJid, {
      text: [
        "🔗 *Discord link code*",
        "",
        `Your one-time code is: *${code}*`,
        "",
        "Open Discord and send:",
        `*.connect ${code}*`,
        "",
        "This code expires in 10 minutes and can only be used once.",
        "Never share this code with anyone else.",
      ].join("\n"),
    }, { quoted: msg });
  },
};