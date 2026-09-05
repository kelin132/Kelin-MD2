/**
 * KELIN MD — .antispam
 * Detects and removes repeated rapid messages in the group.
 * Usage: .antispam on | off
 */
import { groupSettings } from "../../lib/groupSettings.js";

export default {
  name: "antispam",
  description: "Enable anti-spam protection in the group",
  category: "group",
  usage: ".antispam on|off",
  aliases: [],
  cooldown: 5,
  isAdmin: true,

  async run({ sock, msg, args }) {
    const jid    = msg.key.remoteJid;
    const option = args[0]?.toLowerCase();

    if (!jid.endsWith("@g.us")) {
      return sock.sendMessage(jid, {
        text: "❌ This command can only be used in groups.",
      }, { quoted: msg });
    }

    if (!option || !["on", "off"].includes(option)) {
      const settings = groupSettings.get(jid);
      const status   = settings?.antispam ? "✅ ON" : "❌ OFF";
      return sock.sendMessage(jid, {
        text:
`🛡️ *Anti Spam Settings*

Status: ${status}

How it works:
• Triggers if a user sends *5+ messages in 5 seconds*
• First offence: warning + messages deleted
• Second offence: removed from group

Commands:
• *.antispam on* — enable
• *.antispam off* — disable`,
      }, { quoted: msg });
    }

    const enabled = option === "on";
    groupSettings.set(jid, { antispam: enabled });

    return sock.sendMessage(jid, {
      text: enabled
        ? "✅ *Anti spam enabled!*\nSpammers will be warned then removed."
        : "❌ Anti spam *disabled*.",
    }, { quoted: msg });
  },
};
