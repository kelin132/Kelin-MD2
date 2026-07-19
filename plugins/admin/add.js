export default {
  name: "add",
  description: "Add a user to the group",
  category: "admin",
  usage: ".add <number>",
  aliases: ["invite"],
  cooldown: 5,
  isOwner: false,
  isAdmin: true,
  isPremium: false,
  version: "1.0.0",

  async run({ sock, msg, args }) {

    const jid = msg.key.remoteJid;

    if (!jid.endsWith("@g.us")) {
      return sock.sendMessage(jid, {
        text: "❌ This command can only be used in groups."
      });
    }

    if (!args[0]) {
      return sock.sendMessage(jid, {
        text: "Usage: .add 263xxxxxxxxx"
      });
    }

    let number = args[0].replace(/[^0-9]/g, "");

    const user = `${number}@s.whatsapp.net`;

    try {

      await sock.groupParticipantsUpdate(
        jid,
        [user],
        "add"
      );

      await sock.sendMessage(jid, {
        text: `✅ Successfully added @${number}`,
        mentions: [user]
      });

    } catch (err) {

      console.log(err);

      await sock.sendMessage(jid, {
        text:
`❌ Failed to add user.

Possible reasons:
• Bot is not admin
• User has privacy restrictions
• Invalid number`
      });

    }
  },
};