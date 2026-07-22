/**
 * KELIN MD — .setwelcome
 * Sets a custom welcome message for the group.
 * Supports multi-line messages (use actual line breaks or \n escape).
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
    const jid = msg.key.remoteJid;

    if (!jid.endsWith("@g.us")) {
      return sock.sendMessage(jid, { text: "❌ This command only works in groups." }, { quoted: msg });
    }

    // Extract full message body preserving newlines (supports paragraph spacing)
    const rawBody =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      "";
    // Strip command prefix + command name (e.g. ".setwelcome ")
    const prefixMatch = rawBody.match(/^[.!#/]?(setwelcome|customwelcome)\s*/i);
    const text = prefixMatch
      ? rawBody.slice(prefixMatch[0].length).trimEnd()
      : args.join(" ").trim();

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

Paragraph spacing:
  • Send a multi-line message (press Enter between lines)
  • Or type *\\n* where you want a line break

Examples:
  .setwelcome Welcome @user to @group! 🎉
  .setwelcome Hey @user!\\n\\nWelcome to @group 👋\\nWe have @count members!

Current message:
${current ? current : "_(not set — default will be used)_"}

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

    // Build a preview using placeholder values (also process \n escapes)
    const preview = text
      .replace(/@user/g,  "0712345678")
      .replace(/@group/g, "Your Group")
      .replace(/@count/g, "42")
      .replace(/\\n/g, "\n");

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
