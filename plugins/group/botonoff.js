/**
 * .bot on / .bot off
 * Enable or disable the bot in the current group.
 * Only owners and mods can use this command.
 * When the bot is disabled the bot silently ignores ALL commands in that group
 * (except .bot on, which is always available to owners/mods).
 */

import { groupSettings } from "../../lib/groupSettings.js";

export default {
  name: "bot",
  aliases: ["boton", "botoff"],
  description: "Enable or disable the bot in this group",
  category: "group",
  usage: ".bot on | .bot off",
  isMod: true,
  cooldown: 3,

  async run({ sock, msg, args, cmd, isOwner, isMod }) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith("@g.us")) {
      return sock.sendMessage(jid, {
        text: "❌ This command can only be used in groups.",
      }, { quoted: msg });
    }

    // Determine action from alias shortcut or first argument
    let action = args[0]?.toLowerCase();
    if (cmd === "boton")  action = "on";
    if (cmd === "botoff") action = "off";

    if (!action || !["on", "off"].includes(action)) {
      const current = groupSettings.get(jid);
      const state   = current.botEnabled === false ? "❌ OFF" : "✅ ON";
      return sock.sendMessage(jid, {
        text:
          `🤖 *Bot Status:* ${state}\n\n` +
          `• *.bot on*  — enable the bot in this group\n` +
          `• *.bot off* — disable the bot in this group\n\n` +
          `_Only owners and mods can toggle this._`,
      }, { quoted: msg });
    }

    const enable = action === "on";
    groupSettings.set(jid, { botEnabled: enable });

    if (enable) {
      await sock.sendMessage(jid, {
        text: "✅ *Bot has been ENABLED in this group.*\nAll commands are now active.",
      }, { quoted: msg });
    } else {
      await sock.sendMessage(jid, {
        text:
          "🔕 *Bot has been DISABLED in this group.*\n\n" +
          "The bot will no longer respond to commands here.\n" +
          "Use *.bot on* to re-enable it.",
      }, { quoted: msg });
    }
  },
};
