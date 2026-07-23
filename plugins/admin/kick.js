export default {
  name: "kick",
  description: "Kick a member from the group",
  category: "admin",
  usage: ".kick @user  |  reply to their message + .kick",
  aliases: ["remove"],
  cooldown: 3,
  isOwner: false,
  isAdmin: true,
  isPremium: false,
  version: "1.2.0",

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith("@g.us")) {
      return await sock.sendMessage(jid, {
        text: "❌ This command can only be used in groups.",
      }, { quoted: msg });
    }

    // Support: @mention OR replying to their message
    const mentioned     = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const quotedSender  = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const targets       = mentioned.length ? mentioned : quotedSender ? [quotedSender] : [];

    if (!targets.length) {
      return await sock.sendMessage(jid, {
        text: "❌ Mention a user or reply to their message to kick them.\nExample: *.kick @user*  or reply to a message and type *.kick*",
      }, { quoted: msg });
    }

    try {
      await sock.groupParticipantsUpdate(jid, targets, "remove");

      const nameList = targets.map(t => `@${t.split("@")[0]}`).join(", ");
      await sock.sendMessage(jid, {
        text: `✅ ${nameList} has been kicked from the group.`,
        mentions: targets,
      }, { quoted: msg });
    } catch (err) {
      console.error(err);
      await sock.sendMessage(jid, {
        text: "❌ Failed to kick. Make sure I'm an admin and the target isn't an admin.",
      }, { quoted: msg });
    }
  },
};
