import { groupSettings } from "../../lib/groupSettings.js";

export default {
  name: "antilink",
  description: "Enable or disable anti-link protection in groups",
  category: "group",
  usage: ".antilink <on|off> [delete|kick]",
  aliases: [],
  cooldown: 5,
  isAdmin: true,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith("@g.us")) {
      return sock.sendMessage(jid, {
        text: "❌ This command can only be used in groups."
      }, { quoted: msg });
    }

    const option = args[0]?.toLowerCase();
    const action = args[1]?.toLowerCase();
    let settings = groupSettings.get(jid) || {};

    if (option === "off") {
      settings.antilink = false;
      groupSettings.set(jid, settings);
      return sock.sendMessage(jid, { text: "✅ Anti-link has been *disabled*." }, { quoted: msg });
    }

    if (option !== "on" || !["delete", "kick"].includes(action)) {
      return sock.sendMessage(jid, {
        text:
`⚙️ *Anti-Link Settings*

*.antilink on delete*
→ Delete link messages automatically

*.antilink on kick*
→ Delete message and remove the sender

*.antilink off*
→ Disable anti-link protection`
      }, { quoted: msg });
    }

    settings.antilink       = true;
    settings.antilinkAction = action;
    groupSettings.set(jid, settings);

    return sock.sendMessage(jid, {
      text: `✅ Anti-link *enabled*\n\n🔧 Action: *${action}*`
    }, { quoted: msg });
  }
};
