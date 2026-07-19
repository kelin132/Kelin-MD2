/**
 * KELIN MD — .setwelcome
 * Sets a custom welcome message for the group.
 * Actual welcome sending is handled by lib/groupEventHandler.mjs
 */
import { groupSettings } from "../../lib/groupSettings.js";

export default {
  name: "setwelcome",
  description: "Set a custom welcome message for the group",
  category: "group",
  usage: ".setwelcome <message>",
  aliases: ["customwelcome"],
  cooldown: 5,
  isAdmin: true,

  async run({ sock, msg, args }) {
    const jid  = msg.key.remoteJid;
    const text = args.join(" ").trim();

    if (!jid.endsWith("@g.us")) {
      return sock.sendMessage(jid, { text: "❌ This command only works in groups." }, { quoted: msg });
    }

    if (!text) {
      const current = groupSettings.get(jid)?.welcome;
      return sock.sendMessage(jid, {
        text:
`📝 *SET WELCOME MESSAGE*

Usage:
  *.setwelcome <your message>*

Variables:
  @user  — new member's number
  @group — group name
  @count — total member count

Examples:
  .setwelcome Welcome @user to @group! 🎉
  .setwelcome Hey @user! Glad to have you in @group 👋
  .setwelcome @user joined! We now have @count members 🥳

Current message:
${current || "_(not set — default will be used)_"}

To reset to default: *.setwelcome reset*
To toggle on/off:    *.welcome on* / *.welcome off*`,
      }, { quoted: msg });
    }

    // Reset to default
    if (text.toLowerCase() === "reset") {
      const s = groupSettings.get(jid) || {};
      delete s.welcome;
      groupSettings.set(jid, s);
      return sock.sendMessage(jid, {
        text: "🔄 Welcome message reset to default.",
      }, { quoted: msg });
    }

    groupSettings.set(jid, { welcome: text });

    // Build a preview using placeholder values
    const preview = text
      .replace(/@user/g,  "0712345678")
      .replace(/@group/g, "Your Group")
      .replace(/@count/g, "42");

    await sock.sendMessage(jid, {
      text:
`✅ *Welcome message saved!*

📝 Template:
${text}

👁 Preview:
${preview}`,
    }, { quoted: msg });
  },
};
