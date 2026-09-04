/**
 * KELIN MD — .antimention
 * Prevent users from mass-tagging group members.
 *
 * Usage:
 *   .antimention on             — enable (default threshold: 6 mentions)
 *   .antimention on <number>    — enable with custom mention threshold
 *   .antimention off            — disable
 *   .antimention                — show current status
 */
import { groupSettings } from "../../lib/groupSettings.js";

export default {
  name: "antimention",
  description: "Block mass-mention spam in the group",
  category: "group",
  usage: ".antimention <on|off> [threshold]",
  aliases: ["antitag"],
  cooldown: 5,
  isAdmin: true,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith("@g.us")) {
      return sock.sendMessage(jid, {
        text: "❌ This command can only be used in groups.",
      }, { quoted: msg });
    }

    const settings  = groupSettings.get(jid) || {};
    const option    = (args[0] || "").toLowerCase();
    const threshold = settings.antimentionThreshold || 6;

    // ── STATUS ──────────────────────────────────────────────────────────────
    if (!option) {
      return sock.sendMessage(jid, {
        text:
`🛡️ *Anti-Mention Settings*

Status    : ${settings.antimention ? "✅ ON" : "❌ OFF"}
Threshold : ${threshold} mentions per message

Commands:
• *.antimention on* — enable (warn at ${threshold}+ mentions)
• *.antimention on <number>* — set custom threshold
• *.antimention off* — disable

How it works:
• Any message tagging *${threshold}+* users triggers a warning
• Second offence → removed from group
• Admins are always exempt`,
      }, { quoted: msg });
    }

    // ── OFF ─────────────────────────────────────────────────────────────────
    if (option === "off") {
      settings.antimention = false;
      groupSettings.set(jid, settings);
      return sock.sendMessage(jid, {
        text: "✅ Anti-mention has been *disabled*.",
      }, { quoted: msg });
    }

    // ── ON [threshold] ──────────────────────────────────────────────────────
    if (option === "on") {
      const customThreshold = parseInt(args[1], 10);
      if (args[1] && (!Number.isInteger(customThreshold) || customThreshold < 1 || customThreshold > 50)) {
        return sock.sendMessage(jid, {
          text: "❌ Threshold must be a number between 1 and 50.\nExample: *.antimention on 5*",
        }, { quoted: msg });
      }

      settings.antimention          = true;
      settings.antimentionThreshold = customThreshold || settings.antimentionThreshold || 6;
      groupSettings.set(jid, settings);

      return sock.sendMessage(jid, {
        text:
`✅ *Anti-mention enabled!*

🔢 Threshold: *${settings.antimentionThreshold}+ mentions* per message
⚠️ First offence: warning + message deleted
🚫 Second offence: removed from group

Admins are always exempt.`,
      }, { quoted: msg });
    }

    return sock.sendMessage(jid, {
      text: "❌ Invalid option.\n\nUsage: *.antimention on [threshold]* or *.antimention off*",
    }, { quoted: msg });
  },
};
