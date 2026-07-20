const config = require('../../config');
// ── NEW: tell the force-add handler this join is intentional ──────────────────
const { markIntentionalJoin } = require('../../handlers/Bot');

moon({
  name: 'join',
  category: 'owner',
  roles: ["Owner", "True Owner"],
  description: 'Make the bot join a group via invite link',
  async execute(sock, jid, sender, args, m, { reply }) {
    try {
      const inviteLink = args[0];
      if (!inviteLink) {
        return reply("❌ Please provide a WhatsApp group invite link.");
      }
      const inviteRegex = /chat\.whatsapp\.com\/(?:invite\/)?([a-zA-Z0-9_-]{20,26})/;
      const match = inviteLink.match(inviteRegex);
      const inviteCode = match ? match[1] : null;
      if (!inviteCode) {
        return reply("❌ Invalid invite link format. Please provide a full chat.whatsapp.com link.");
      }
      let groupJid;
      try {
        const info = await sock.groupGetInviteInfo(inviteCode);
        // ── Mark as intentional BEFORE joining ───────────────────────────
        if (info?.id) markIntentionalJoin(info.id);
        groupJid = await sock.groupAcceptInvite(inviteCode);
        if (!groupJid) {
          groupJid = info.id;
        }
      } catch (err) {
        console.error("Join failed:", err.message);
        if (err.message.includes('406') || err.message.includes('not-authorized')) {
          return reply("❌ Could not join: The bot might be banned from this group or the invite is restricted.");
        } else if (err.message.includes('410') || err.message.includes('gone')) {
          return reply("❌ Could not join: This invite link has expired or been reset.");
   } else if (err.message.includes('409') || err.message.includes('conflict')) {
          return reply("ℹ️ The bot is already a member of this group.");
        } else if (err.message.includes('429')) {
          return reply("❌ Rate limited: Too many join attempts. Please try again later.");
        }
        return reply(`❌ Could not join group: ${err.message || "Invalid or expired invite"}`);
      }
      const text = `
╭━━━『 𝚳OO𝚴𝐋𝚰𝐆𝚮𝚻 』━━━╮
⟢ ${config.BOT_NAME} joined the group
> *hy* my name is *${config.BOT_NAME}* i am a private bot that was created by my good lord ${config.BOT_NAME}
╰━━━━━━━━━━━━━━━━━╯
📌 *IMPORTANT INFORMATION*
• Use \`.rules\` to see full community/usage rules
• Do NOT DM the bot privately
• Do NOT spam commands
• Keep group behavior clean
⚙️ *System Notice:*
This bot requires admin permissions.
Please promote it immediately as it join the group.
> 🔐 ${config.BOT_NAME} System Active
if you have any questions please use \`.mods\` and get support
`.trim();
      try {
        if (config.MENU_IMAGE) {
          await sock.sendMessage(groupJid, { 
            image: { url: config.MENU_IMAGE },
            caption: text 
          });
  } else {
          await sock.sendMessage(groupJid, { text });
        }
      } catch (err) {
        console.error("Post-join message failed:", err.message);
        await sock.sendMessage(groupJid, { text }).catch(e => console.error("Fallback failed:", e.message));
      }
      return reply('✅ Successfully joined the group.');
    } catch (err) {  } else if (err.message.includes('409') || err.message.includes('conflict')) {
          return reply("ℹ️ The bot is already a member of this group.");
        } else if (err.message.includes('429')) {
          return reply("❌ Rate limited: Too many join attempts. Please try again later.");
        }
        return reply(`❌ Could not join group: ${err.message || "Invalid or expired invite"}`);
      }
const text = `
╭━━━『 𝚳OO𝚴𝐋𝚰𝐆𝚮𝚻 』━━━╮
⟢ ${config.BOT_NAME} joined the group
> *hy* my name is *${config.BOT_NAME}* i am a private bot that was created by my good lord ${config.BOT_NAME}
╰━━━━━━━━━━━━━━━━━╯
📌 *IMPORTANT INFORMATION*
• Use \`.rules\` to see full community/usage rules
• Do NOT DM the bot privately
• Do NOT spam commands
• Keep group behavior clean
⚙️ *System Notice:*
This bot requires admin permissions.
Please promote it immediately as it join the group.
> 🔐 ${config.BOT_NAME} System Active
if you have any questions please use \`.mods\` and get support
`.trim();
      try {
        if (config.MENU_IMAGE) {
          await sock.sendMessage(groupJid, { 
            image: { url: config.MENU_IMAGE },
            caption: text 
          });
        } else {
          await sock.sendMessage(groupJid, { text });
        }
      } catch (err) {
        console.error("Post-join message failed:", err.message);
        await sock.sendMessage(groupJid, { text }).catch(e => console.error("Fallback failed:", e.message));
      }
      return reply('✅ Successfully joined the group.');
    } catch (err) {
      console.error('Join command error:', err);
      return reply("❌ An unexpected error occurred while trying to join.");
    }
  }
console.error('Join command error:', err);
      return reply("❌ An unexpected error occurred while trying to join.");
    }
  }
});
