/**
 * KELIN MD — Group participant event handler
 * Handles:
 *   • Bot added to a group  → "THANKS FOR ADDING ME HERE 💐"
 *   • Member joins a group  → welcome message (if enabled)
 *   • Member leaves a group → goodbye message (if enabled)
 *
 * Registered in lib/bot.mjs on the "group-participants.update" Baileys event.
 */
import { groupSettings } from "./groupSettings.js";
import { log } from "./logger.mjs";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strip a JID to bare digits: "27628114340:5@s.whatsapp.net" → "27628114340" */
function jidNum(jid = "") {
  return jid.split("@")[0].split(":")[0].replace(/\D/g, "");
}

/** Try to fetch a member's display name, fall back to their number. */
async function getDisplayName(sock, participantJid, groupMeta) {
  const num = jidNum(participantJid);
  try {
    const biz = await sock.getBusinessProfile(participantJid);
    if (biz?.name) return biz.name;
  } catch { /* not a business */ }
  try {
    const p = (groupMeta?.participants || []).find(x => x.id === participantJid);
    if (p?.name) return p.name;
  } catch { /* ignore */ }
  return num;
}

/** Resolve template variables in a custom message. */
function applyVars(template, { user, group, count }) {
  return template
    .replace(/@user/g,  `@${user}`)
    .replace(/@group/g, group)
    .replace(/@count/g, String(count));
}

/** Format the current time in Africa/Lagos timezone. */
function timeStr() {
  return new Date().toLocaleString("en-NG", {
    timeZone:   "Africa/Lagos",
    month:  "2-digit",
    day:    "2-digit",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ── Main handler ──────────────────────────────────────────────────────────────

/**
 * Call this from bot.mjs on every "group-participants.update" event.
 *
 * @param {object} sock   – Baileys socket
 * @param {object} update – { id, participants, action }
 */
export async function handleGroupParticipants(sock, update) {
  const { id: groupJid, participants, action } = update;

  // Resolve bot's own JID digits once
  const botJid = sock.user?.id || "";
  const botNum = jidNum(botJid);

  // Fetch group metadata once (shared across all participants in this event)
  let groupMeta = null;
  try {
    groupMeta = await sock.groupMetadata(groupJid);
  } catch { /* metadata unavailable */ }

  const groupName = groupMeta?.subject || "the group";
  const memberCount = groupMeta?.participants?.length ?? 0;

  for (const rawParticipant of participants) {
    const participantJid = typeof rawParticipant === "string"
      ? rawParticipant
      : rawParticipant.id || String(rawParticipant);

    const participantNum = jidNum(participantJid);

    // ── BOT was added to the group ──────────────────────────────────────────
    if (action === "add" && participantNum === botNum) {
      try {
        await sock.sendMessage(groupJid, {
          text: "THANKS FOR ADDING ME HERE 💐",
        });
        log("info", `Bot added to group: ${groupJid}`);
      } catch (err) {
        log("error", `Failed to send join greeting: ${err.message}`);
      }
      continue;
    }

    // ── Regular member JOINED ───────────────────────────────────────────────
    if (action === "add") {
      const settings = groupSettings.get(groupJid);
      if (!settings?.welcomeEnabled) continue;

      try {
        const displayName = await getDisplayName(sock, participantJid, groupMeta);
        const num         = participantNum;

        let text;
        if (settings.welcome) {
          // Use custom template
          text = applyVars(settings.welcome, {
            user:  num,
            group: groupName,
            count: memberCount,
          });
        } else {
          // Default welcome message
          text =
`╭━━━〔 👋 *WELCOME!* 〕━━━╮

  🙋 Member : @${num}
  👥 Count  : ${memberCount}
  🕐 Time   : ${timeStr()}

  Welcome to *${groupName}*! 🎉
  We're glad to have you here.

╰━━━━━━━━━━━━━━━━━━━━╯

> _Powered by KELIN MD_ ⚡`;
        }

        await sock.sendMessage(groupJid, {
          text,
          mentions: [participantJid],
        });
      } catch (err) {
        log("error", `Welcome message error: ${err.message}`);
      }
      continue;
    }

    // ── Regular member LEFT / was REMOVED ──────────────────────────────────
    if (action === "remove") {
      const settings = groupSettings.get(groupJid);
      if (!settings?.goodbyeEnabled) continue;

      try {
        const num = participantNum;

        let text;
        if (settings.goodbye) {
          text = applyVars(settings.goodbye, {
            user:  num,
            group: groupName,
            count: memberCount,
          });
        } else {
          text =
`👋 *@${num}* has left *${groupName}*.

We'll miss you! Take care 🙏

> _KELIN MD_ ⚡`;
        }

        await sock.sendMessage(groupJid, {
          text,
          mentions: [participantJid],
        });
      } catch (err) {
        log("error", `Goodbye message error: ${err.message}`);
      }
    }
  }
}
