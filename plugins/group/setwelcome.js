import { groupSettings } from "../../lib/groupSettings.js";

export default {
  name: "setwelcome",
  description: "Set group welcome message",
  category: "group",
  usage: ".setwelcome <message>",
  aliases: [],
  cooldown: 5,
  isOwner: false,
  isAdmin: true,
  isPremium: false,
  version: "2.0.0",

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith("@g.us")) {
      return await sock.sendMessage(jid, {
        text: "❌ This command only works in groups."
      });
    }

    const text = args.join(" ");

    if (!text) {
      return await sock.sendMessage(jid, {
        text: `📝 *SET WELCOME MESSAGE*

Usage:
.setwelcome <your message>

Variables you can use:
@user = Member's name
@group = Group name
@date = Current date
@members = Total members

Examples:
.setwelcome Welcome @user to @group! 🎉
.setwelcome Hey @user, glad to have you here! 👋
.setwelcome @user joined @group with @members members!

Current welcome message:
${groupSettings.get(jid)?.welcome || "Not set"}`
      });
    }

    try {
      let settings = groupSettings.get(jid) || {};
      settings.welcome = text;
      groupSettings.set(jid, settings);

      await sock.sendMessage(jid, {
        text: `✅ *Welcome message updated!*

📝 Message:
${text}`
      });
    } catch (error) {
      console.error("Error setting welcome:", error);
      await sock.sendMessage(jid, {
        text: "❌ Error setting welcome message. Please try again."
      });
    }
  }
};
