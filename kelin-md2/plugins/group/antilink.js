/**
 * KELIN MD — .antilink
 * Enable / disable anti-link protection with configurable action and warn limit.
 *
 * Usage:
 *   .antilink on delete          — delete link messages silently
 *   .antilink on kick            — delete + remove sender immediately
 *   .antilink on warn            — delete + issue warn (remove at max warns)
 *   .antilink setwarn <number>   — set max antilink warnings before removal (default: 3)
 *   .antilink resetwarn @user    — reset a user's antilink warn count
 *   .antilink off                — disable anti-link
 *   .antilink                    — show current status
 */
import { groupSettings } from "../../lib/groupSettings.js";
import { resetLinkWarns } from "./antilinkHandler.js";

export default {
  name: "antilink",
  description: "Enable or disable anti-link protection in groups",
  category: "group",
  usage: ".antilink <on|off> [delete|kick|warn] | .antilink setwarn <n> | .antilink resetwarn @user",
  aliases: [],
  cooldown: 5,
  isAdmin: true,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith("@g.us")) {
      return sock.sendMessage(jid, {
        text: "❌ This command can only be used in groups.",
      }, { quoted: msg });
    }

    let settings = groupSettings.get(jid) || {};
    const option  = args[0]?.toLowerCase();

    // ── .antilink off ──────────────────────────────────────────────────────
    if (option === "off") {
      settings.antilink = false;
      groupSettings.set(jid, settings);
      return sock.sendMessage(jid, { text: "✅ Anti-link has been *disabled*." }, { quoted: msg });
    }

    // ── .antilink setwarn <number> ─────────────────────────────────────────
    if (option === "setwarn") {
      const n = parseInt(args[1], 10);
      if (isNaN(n) || n < 1 || n > 20) {
        return sock.sendMessage(jid, {
          text: "❌ Please provide a valid number between 1 and 20.\nExample: *.antilink setwarn 3*",
        }, { quoted: msg });
      }
      settings.antilinkMaxWarns = n;
      groupSettings.set(jid, settings);
      return sock.sendMessage(jid, {
        text: `✅ Anti-link warn limit set to *${n}* warning(s).\nUsers will be removed after ${n} link warning(s).`,
      }, { quoted: msg });
    }

    // ── .antilink resetwarn @user ──────────────────────────────────────────
    if (option === "resetwarn") {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const target = mentioned[0];
      if (!target) {
        return sock.sendMessage(jid, {
          text: "❌ Mention a user to reset their antilink warnings.\nExample: *.antilink resetwarn @user*",
        }, { quoted: msg });
      }
      await resetLinkWarns(jid, target);
      return sock.sendMessage(jid, {
        text: `✅ Anti-link warnings reset for @${target.split("@")[0]}.`,
        mentions: [target],
      }, { quoted: msg });
    }

    // ── .antilink on <action> ──────────────────────────────────────────────
    if (option === "on") {
      const action = args[1]?.toLowerCase();
      if (!["delete", "kick", "warn"].includes(action)) {
        return sock.sendMessage(jid, {
          text: [
            `⚙️ *Anti-Link Settings*`,
            ``,
            `*.antilink on delete*`,
            `→ Delete link messages automatically`,
            ``,
            `*.antilink on kick*`,
            `→ Delete message and remove the sender immediately`,
            ``,
            `*.antilink on warn*`,
            `→ Delete message and issue a warning`,
            `  (removed after reaching the warn limit)`,
            ``,
            `*.antilink setwarn <number>*`,
            `→ Set how many warnings before removal (default: 3)`,
            ``,
            `*.antilink resetwarn @user*`,
            `→ Clear a user's anti-link warning count`,
            ``,
            `*.antilink off*`,
            `→ Disable anti-link protection`,
          ].join("\n"),
        }, { quoted: msg });
      }

      settings.antilink       = true;
      settings.antilinkAction = action;
      if (!settings.antilinkMaxWarns) settings.antilinkMaxWarns = 3;
      groupSettings.set(jid, settings);

      const maxWarns = settings.antilinkMaxWarns;
      const extra = action === "warn"
        ? `\n⚠️ Warn limit : *${maxWarns}* (change with *.antilink setwarn <n>*)`
        : "";

      return sock.sendMessage(jid, {
        text: `✅ Anti-link *enabled*\n\n🔧 Action: *${action}*${extra}`,
      }, { quoted: msg });
    }

    // ── .antilink (no args) — show status ─────────────────────────────────
    const status = settings.antilink
      ? `✅ *ON* — Action: *${settings.antilinkAction || "delete"}*${
          settings.antilinkAction === "warn"
            ? ` | Max warns: *${settings.antilinkMaxWarns || 3}*`
            : ""
        }`
      : "❌ *OFF*";

    return sock.sendMessage(jid, {
      text: [
        `🔗 *Anti-Link Status*`,
        ``,
        `Status : ${status}`,
        ``,
        `Commands:`,
        `• *.antilink on delete* — auto-delete links`,
        `• *.antilink on kick* — delete + remove sender`,
        `• *.antilink on warn* — delete + warn (remove at limit)`,
        `• *.antilink setwarn <n>* — set warn limit`,
        `• *.antilink resetwarn @user* — clear user's warns`,
        `• *.antilink off* — disable`,
      ].join("\n"),
    }, { quoted: msg });
  },
};
