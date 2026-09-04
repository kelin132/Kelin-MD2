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

  async run({ sock, msg, cmd, discord }) {
    const discordMessage = discord?.message;
    if (discordMessage?.guild) {
      const channel = discordMessage.channel;
      if (!channel?.isTextBased?.() || typeof channel.createInvite !== "function") {
        return discordMessage.reply("❌ This channel cannot create server invites.");
      }

      try {
        if (cmd === "revoke") {
          const invites = await discordMessage.guild.invites.fetch();
          const ownInvites = invites.filter(
            (invite) =>
              invite.inviterId === discordMessage.client.user.id &&
              invite.channelId === channel.id,
          );
          await Promise.all([...ownInvites.values()].map((invite) => invite.delete().catch(() => {})));
        }

        const invite = await channel.createInvite({
          maxAge: 0,
          maxUses: 0,
          unique: true,
          reason: cmd === "revoke" ? "AKIRA server invite reset" : "AKIRA server invite requested",
        });
        return discordMessage.reply(
          cmd === "revoke"
            ? `🔄 *Server invite reset.*\n\n🔗 ${invite.url}`
            : `🔗 *Server Invite*\n\n${invite.url}\n\n_Use .revoke to reset this invite._`,
        );
      } catch {
        return discordMessage.reply("❌ I need permission to create/manage invites in this channel.");
      }
    }

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
