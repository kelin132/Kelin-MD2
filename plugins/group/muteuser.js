/**
 * KELIN MD — .muteuser / .unmuteuser
 * Silence a specific group member: their messages get auto-deleted while muted.
 * Muted-user list is stored per group in groupSettings (MongoDB-backed).
 *
 * Usage:
 *   .muteuser @user          — mute a member
 *   .muteuser @user [reason] — mute with reason
 *   .unmuteuser @user        — unmute a member
 *   .mutelist                — show all currently muted members
 */
import { groupSettings } from "../../lib/groupSettings.js";
import { participantMatchesIdentity } from "../../lib/identity.mjs";
import { resolveTargetIdentity } from "../../lib/profileIdentity.mjs";

function resolveTarget(msg) {
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (mentioned.length) return mentioned[0];
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant
              || msg.message?.extendedTextMessage?.contextInfo?.quotedParticipant;
  return quoted || null;
}

export default {
  name: "muteuser",
  aliases: ["silenceuser", "unmuteuser", "unmute-user", "mute-user", "mutelist"],
  description: "Mute or unmute a specific group member (their messages get deleted)",
  category: "group",
  usage: ".muteuser @user [reason] | .unmuteuser @user | .mutelist",
  isAdmin: true,
  cooldown: 3,

  async run({ sock, msg, cmd, args, sender }) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith("@g.us")) {
      return sock.sendMessage(jid, {
        text: "❌ This command can only be used in groups.",
      }, { quoted: msg });
    }

    const settings = groupSettings.get(jid) || {};
    const mutedUsers = settings.mutedUsers || {};

    // ── .mutelist ──────────────────────────────────────────────────────────
    if (cmd === "mutelist") {
      const list = Object.entries(mutedUsers);
      if (!list.length) {
        return sock.sendMessage(jid, {
          text: "✅ No members are currently muted in this group.",
        }, { quoted: msg });
      }
      const lines = list.map(([jid_, info]) =>
        `• @${jid_.split("@")[0]}${info.reason ? ` — ${info.reason}` : ""}`
      );
      return sock.sendMessage(jid, {
        text: `🔇 *Muted Members (${list.length})*\n\n${lines.join("\n")}`,
        mentions: list.map(([j]) => j),
      }, { quoted: msg });
    }

    const isUnmute = cmd === "unmuteuser" || cmd === "unmute-user";
    const rawTarget = resolveTarget(msg);

    if (!rawTarget) {
      return sock.sendMessage(jid, {
        text: isUnmute
          ? "❌ Mention or reply to the user you want to unmute.\n*.unmuteuser @user*"
          : "❌ Mention or reply to the user you want to mute.\n*.muteuser @user [reason]*",
      }, { quoted: msg });
    }
    const target = await resolveTargetIdentity(rawTarget, { sender, sock, chatId: jid });

    // Never mute the bot itself
    const botNum = (sock.user?.id ?? "").split(":")[0];
    if (botNum && target.startsWith(botNum)) {
      return sock.sendMessage(jid, { text: "❌ I can't mute myself." }, { quoted: msg });
    }

    // Don't mute group admins
    try {
      const meta    = await sock.groupMetadata(jid);
      const admins = meta.participants.filter((participant) => participant.admin);
      if (!isUnmute && admins.some((participant) =>
        participantMatchesIdentity(participant, [rawTarget, target]),
      )) {
        return sock.sendMessage(jid, {
          text: "❌ You can't mute a group admin.",
        }, { quoted: msg });
      }
    } catch { /* allow if metadata unavailable */ }

    const targetNum = target.split("@")[0];

    if (isUnmute) {
      if (!mutedUsers[target]) {
        return sock.sendMessage(jid, {
          text: `⚠️ @${targetNum} is not currently muted.`,
          mentions: [target],
        }, { quoted: msg });
      }
      delete mutedUsers[target];
      groupSettings.set(jid, { ...settings, mutedUsers });
      return sock.sendMessage(jid, {
        text: `🔊 *@${targetNum} has been unmuted.*\nThey can send messages again.`,
        mentions: [target],
      }, { quoted: msg });
    }

    // Mute
    const reason = args.filter(a => !a.startsWith("@")).join(" ").trim() || null;
    mutedUsers[target] = { mutedAt: new Date().toISOString(), reason };
    groupSettings.set(jid, { ...settings, mutedUsers });

    return sock.sendMessage(jid, {
      text: [
        `🔇 *@${targetNum} has been muted.*`,
        reason ? `📝 Reason: ${reason}` : "",
        ``,
        `Their messages will be deleted automatically.`,
        `Use *.unmuteuser @${targetNum}* to unmute.`,
      ].filter(Boolean).join("\n"),
      mentions: [target],
    }, { quoted: msg });
  },
};
