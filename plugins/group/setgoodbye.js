import { groupSettings } from "../../lib/groupSettings.js";

export default {
  name: "setgoodbye",
  description: "Set group goodbye message",
  category: "group",
  usage: ".setgoodbye <message>",
  aliases: ["goodbye"],
  cooldown: 5,
  isOwner: false,
  isAdmin: true,
  isPremium: false,
  version: "1.0.0",

  async run({ sock, msg, args }) {

    const jid = msg.key.remoteJid;

    if (!jid.endsWith("@g.us")) {
      return sock.sendMessage(jid, {
        text: "❌ This command only works in groups."
      });
    }

    const text = args.join(" ");

    if (!text) {
      return sock.sendMessage(jid, {
        text:
`Usage:
.setgoodbye Goodbye @user, thanks for staying! 👋

Variables:
@user = member name`
      });
    }

    let settings = groupSettings.get(jid) || {};

    settings.goodbye = text;

    groupSettings.set(jid, settings);

    await sock.sendMessage(jid, {
      text:
`✅ Goodbye message updated!

Message:
${text}`
    });
  }
};
