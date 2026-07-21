/**
 * KELIN MD — .linkgroup / .revoke
 * .linkgroup — Get the group invite link
 * .revoke    — Reset the group invite link
 */
export default {
  name: "link",
  description: "Get or reset the group invite link",
  category: "group",
  usage: ".invite | .revoke",
  aliases: ["revoke", "grouplink", "invite"],
  cooldown: 10,
  isAdmin: true,

  async run({ sock, msg, cmd }) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith("@g.us")) {
      return sock.sendMessage(jid, {
        text: "❌ This command can only be used in groups.",
      }, { quoted: msg });
    }

    if (cmd === "revoke") {
      try {
        const newCode = await sock.groupRevokeInvite(jid);
        return sock.sendMessage(jid, {
          text:
`🔄 *Group Link Revoked!*

The old invite link is now invalid.

🔗 New link:
https://chat.whatsapp.com/${newCode}`,
        }, { quoted: msg });
      } catch {
        return sock.sendMessage(jid, {
          text: "❌ Failed to revoke link. Make sure I'm an admin.",
        }, { quoted: msg });
      }
    }

    // .linkgroup
    try {
      const code = await sock.groupInviteCode(jid);
      return sock.sendMessage(jid, {
        text:
`🔗 *Group Invite Link*

https://chat.whatsapp.com/${code}

_Use .revoke to reset this link._`,
      }, { quoted: msg });
    } catch {
      return sock.sendMessage(jid, {
        text: "❌ Failed to get invite link. Make sure I'm an admin.",
      }, { quoted: msg });
    }
  },
};
