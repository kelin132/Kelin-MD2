/**
 * KELIN MD — .setgoodbye
 * Sets a custom goodbye message for the group.
 * Actual goodbye sending is handled by lib/groupEventHandler.mjs
 */
import { groupSettings } from "../../lib/groupSettings.js";

export default {
  name: "setgoodbye",
  description: "Set a custom goodbye message for the group",
  category: "group",
  usage: ".setgoodbye <message>",
  aliases: ["customgoodbye"],
  cooldown: 5,
  isAdmin: true,

  async run({ sock, msg, args }) {
    const jid  = msg.key.remoteJid;
    const text = args.join(" ").trim();

    if (!jid.endsWith("@g.us")) {
      return sock.sendMessage(jid, { text: "❌ This command only works in groups." }, { quoted: msg });
    }

    if (!text) {
      const current = groupSettings.get(jid)?.goodbye;
      return sock.sendMessage(jid, {
        text:
`📝 *SET GOODBYE MESSAGE*

Usage:
  *.setgoodbye <your message>*

Variables:
  @user  — member's number
  @group — group name
  @count — remaining member count

Examples:
  .setgoodbye Goodbye @user, take care! 👋
  .setgoodbye @user has left @group. We'll miss you! 😢

Current message:
${current || "_(not set — default will be used)_"}

To reset to default: *.setgoodbye reset*
To toggle on/off:    *.goodbye on* / *.goodbye off*`,
      }, { quoted: msg });
    }

    if (text.toLowerCase() === "reset") {
      const s = groupSettings.get(jid) || {};
      delete s.goodbye;
      groupSettings.set(jid, s);
      return sock.sendMessage(jid, {
        text: "🔄 Goodbye message reset to default.",
      }, { quoted: msg });
    }

    groupSettings.set(jid, { goodbye: text });

    const preview = text
      .replace(/@user/g,  "0712345678")
      .replace(/@group/g, "Your Group")
      .replace(/@count/g, "41");

    await sock.sendMessage(jid, {
      text:
`✅ *Goodbye message saved!*

📝 Template:
${text}

👁 Preview:
${preview}`,
    }, { quoted: msg });
  },
};
