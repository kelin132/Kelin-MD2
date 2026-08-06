/**
 * KELIN MD — .goodbye on|off
 * Toggles goodbye messages when members leave the group.
 * Actual goodbye sending is handled by lib/groupEventHandler.mjs
 */
import { groupSettings } from "../../lib/groupSettings.js";

export default {
  name: "goodbye",
  description: "Toggle goodbye messages when members leave",
  category: "group",
  usage: ".goodbye on|off",
  aliases: [],
  cooldown: 5,
  isAdmin: true,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith("@g.us")) {
      return sock.sendMessage(jid, { text: "❌ This command only works in groups." }, { quoted: msg });
    }

    const toggle   = args[0]?.toLowerCase();
    const settings = groupSettings.get(jid);

    if (!toggle || !["on", "off"].includes(toggle)) {
      const status  = settings?.goodbyeEnabled ? "✅ ON" : "❌ OFF";
      const current = settings?.goodbye || "_(default message)_";
      return sock.sendMessage(jid, {
        text:
`👋 *GOODBYE SETTINGS*

Status : ${status}
Message: ${current}

Usage:
• *.goodbye on* — enable goodbye messages
• *.goodbye off* — disable goodbye messages
• *.setgoodbye <msg>* — set custom message`,
      }, { quoted: msg });
    }

    const enabled = toggle === "on";
    groupSettings.set(jid, { goodbyeEnabled: enabled });

    await sock.sendMessage(jid, {
      text: enabled
        ? `✅ Goodbye messages *enabled*!\n\nUse *.setgoodbye <msg>* to set a custom message.`
        : `❌ Goodbye messages *disabled*.`,
    }, { quoted: msg });
  },
};
