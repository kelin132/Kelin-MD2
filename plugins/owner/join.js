/**
 * KELIN MD — .join / .leave
 * Owner-only commands to join a group via invite link and leave a group.
 *
 * Settings pulled from settings.cjs (botName, ownerName).
 * No external lib needed — uses Baileys sock.groupGetInviteInfo +
 * sock.groupAcceptInvite directly, matching the rest of this codebase.
 */
import { createRequire } from "module";

const _require  = createRequire(import.meta.url);
const _settings = _require("../../settings.cjs");

const BOT_NAME   = _settings.botName   || "KELIN MD";
const OWNER_NAME = _settings.botOwner  || "Kelin";

export default {
  name:        "join",
  aliases:     ["leave"],
  category:    "owner",
  description: "Join a group via invite link (or leave current group)",
  usage:       ".join <invite_link>  |  .leave",
  cooldown:    5,
  isOwner:     true,

  async run({ sock, msg, cmd, args }) {
    const jid   = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    // ── .leave ───────────────────────────────────────────────────────────
    if (cmd === "leave") {
      if (!jid.endsWith("@g.us")) {
        return reply("❌ This command can only be used inside a group.");
      }
      try {
        await reply("👋 Leaving this group now. Goodbye!");
        await sock.groupLeave(jid);
      } catch (err) {
        console.error("[join.js] Leave error:", err.message);
        return reply(`❌ Failed to leave: ${err.message}`);
      }
      return;
    }

    // ── .join ────────────────────────────────────────────────────────────
    const inviteLink = args[0];
    if (!inviteLink) {
      return reply(
`❌ Please provide a WhatsApp group invite link.

*Usage:*
.join https://chat.whatsapp.com/XXXXXXXXXXXXXXXXXXXXXX`
      );
    }

    // Extract the invite code from any valid chat.whatsapp.com URL format
    const inviteRegex = /chat\.whatsapp\.com\/(?:invite\/)?([a-zA-Z0-9_-]{20,26})/;
    const match       = inviteLink.match(inviteRegex);
    const inviteCode  = match ? match[1] : null;

    if (!inviteCode) {
      return reply(
`❌ Invalid invite link format.

Make sure the link looks like:
https://chat.whatsapp.com/XXXXXXXXXXXXXXXXXXXXXX`
      );
    }

    // ── Step 1: preview the group before joining ─────────────────────────
    let groupInfo;
    try {
      groupInfo = await sock.groupGetInviteInfo(inviteCode);
    } catch (err) {
      console.error("[join.js] groupGetInviteInfo error:", err.message);
      if (err.message?.includes("410") || err.message?.includes("gone")) {
        return reply("❌ This invite link has *expired* or been reset.");
      }
      if (err.message?.includes("404")) {
        return reply("❌ Invite link not found — it may have been revoked.");
      }
      return reply(`❌ Could not fetch group info: ${err.message}`);
    }

    const groupName = groupInfo?.subject || "Unknown Group";
    const groupId   = groupInfo?.id;

    // ── Step 2: accept the invite ─────────────────────────────────────────
    let groupJid;
    try {
      groupJid = await sock.groupAcceptInvite(inviteCode);
      // Some Baileys versions return null; fall back to the previewed ID
      if (!groupJid && groupId) groupJid = groupId;
    } catch (err) {
      console.error("[join.js] groupAcceptInvite error:", err.message);

      if (err.message?.includes("406") || err.message?.includes("not-authorized")) {
        return reply("❌ Could not join: The bot may be *banned* from this group, or the invite is admin-only.");
      }
      if (err.message?.includes("410") || err.message?.includes("gone")) {
        return reply("❌ Could not join: This invite link has *expired* or been reset.");
      }
      if (err.message?.includes("409") || err.message?.includes("conflict")) {
        return reply("ℹ️ The bot is *already a member* of this group.");
      }
      if (err.message?.includes("429")) {
        return reply("❌ *Rate limited* — too many join attempts. Please wait a few minutes and try again.");
      }
      return reply(`❌ Could not join group: ${err.message || "Unknown error"}`);
    }

    // ── Step 3: confirm to the command sender ────────────────────────────
    await reply(
`✅ *Successfully joined!*

📌 Group: *${groupName}*
🆔 JID: \`${groupJid}\`

${BOT_NAME} is now in the group.`
    );

    // ── Step 4: send intro image in the new group ───────────────────────
    if (!groupJid) return;

    const introText =
`╭━━━『 ${BOT_NAME} 』━━━╮

 *Hey Everyone!* I'm *${BOT_NAME}*.

📌 *IMPORTANT INFORMATION*
• Use *.menu* to see all available commands
• Do NOT spam commands
• Bot DMs are disabled

 Use *.mods* if you need help!

╰━━━━━━━━━━━━━━━━━━━━╯`;

    try {
      await sock.sendMessage(groupJid, {
        image: {
          url: "https://cdn.phototourl.com/free/2026-07-21-94dccfa3-fa8a-4b74-8492-4a1b8034c379.jpg"
        },
        caption: introText
      });
    } catch (err) {
      console.error("[join.js] Post-join image failed:", err.message);

      // Fallback to text if the image can't be sent
      try {
        await sock.sendMessage(groupJid, {
          text: introText
        });
      } catch {}
    }