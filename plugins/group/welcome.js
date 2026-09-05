/**
 * KELIN MD — .welcome on|off
 * Toggles welcome messages for the group and shows current status.
 * Actual welcome sending is handled by lib/groupEventHandler.mjs
 */
import { groupSettings } from "../../lib/groupSettings.js";

export default {
  name: "welcome",
  description: "Toggle welcome messages for new members",
  category: "group",
  usage: ".welcome on|off",
  aliases: [],
  cooldown: 5,
  isAdmin: true,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith("@g.us")) {
      return sock.sendMessage(jid, { text: "❌ This command only works in groups." }, { quoted: msg });
    }

    const toggle = args[0]?.toLowerCase();
    const settings = groupSettings.get(jid);

    if (!toggle || !["on", "off"].includes(toggle)) {
      const status  = settings?.welcomeEnabled ? "✅ ON" : "❌ OFF";
      const current = settings?.welcome || "_(default message)_";
      return sock.sendMessage(jid, {
        text:
`👋 *WELCOME SETTINGS*

Status : ${status}
Message: ${current}

Usage:
• *.welcome on* — enable welcome messages
• *.welcome off* — disable welcome messages
• *.setwelcome <msg>* — set custom message

Variables for custom message:
• @user  — member's phone number
• @group — group name
• @count — total member count`,
      }, { quoted: msg });
    }

    const enabled = toggle === "on";
    groupSettings.set(jid, { welcomeEnabled: enabled });

    await sock.sendMessage(jid, {
      text: enabled
        ? `✅ Welcome messages *enabled*!\n\nNew members will be greeted.\nUse *.setwelcome <msg>* to set a custom message.`
        : `❌ Welcome messages *disabled*.`,
    }, { quoted: msg });
  },
};
