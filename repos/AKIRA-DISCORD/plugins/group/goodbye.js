/**
 * KELIN MD — .goodbye on|off
 * Toggles goodbye messages when members leave the group.
 * Actual goodbye sending is handled by lib/groupEventHandler.mjs
 */
import { groupSettings } from "../../lib/groupSettings.js";
import { discordSettingsKey } from "../../lib/discordGroupEvents.mjs";

export default {
  name: "goodbye",
  description: "Toggle goodbye messages when members leave",
  category: "group",
  usage: ".goodbye on|off",
  aliases: [],
  cooldown: 5,
  isAdmin: true,

  async run({ sock, msg, args, discord }) {
    const discordMessage = discord?.message;
    if (discordMessage?.guild) {
      const key = discordSettingsKey(discordMessage.guild.id);
      const settings = groupSettings.get(key);
      const toggle = args[0]?.toLowerCase();
      if (!toggle || !["on", "off"].includes(toggle)) {
        return discordMessage.reply(
          `👋 **Discord Goodbye Messages**\n\nStatus: ${settings.goodbyeEnabled ? "✅ ON" : "❌ OFF"}\n` +
          `Channel: ${settings.goodbyeChannelId ? `<#${settings.goodbyeChannelId}>` : "Server system channel"}\n\n` +
          "Use `.goodbye on` or `.goodbye off`.\n" +
          "Use `.setgoodbye <message>` to customize it.\n" +
          "Use `.setgoodbye image member|group|off` for the avatar/icon.",
        );
      }

      const enabled = toggle === "on";
      groupSettings.set(key, {
        goodbyeEnabled: enabled,
        goodbyeChannelId: discordMessage.channel.id,
      });
      return discordMessage.reply(enabled
        ? "✅ Goodbye messages enabled when members leave the server."
        : "❌ Goodbye messages disabled.");
    }

    const jid = msg.key.remoteJid;

    if (!jid.endsWith("@g.us")) {
      return sock.sendMessage(jid, { text: "❌ This command only works in groups." }, { quoted: msg });
    }

    const toggle   = args[0]?.toLowerCase();
    const settings = groupSettings.get(jid);

    if (!toggle || !["on", "off"].includes(toggle)) {
      const status  = settings?.goodbyeEnabled ? "✅ ON" : "❌ OFF";
      const current = settings?.goodbye || "_(default message)_";
      return sock.sendMessage(jid, {
        text:
`👋 *GOODBYE SETTINGS*

Status : ${status}
Message: ${current}

Usage:
• *.goodbye on* — enable goodbye messages
• *.goodbye off* — disable goodbye messages
• *.setgoodbye <msg>* — set custom message

Variables:
• @user  — leaving member
• @group — server name
• @count — remaining member count
• {br}   — blank line / paragraph break

Image: *.setgoodbye image member|group|off*`,
      }, { quoted: msg });
    }

    const enabled = toggle === "on";
    groupSettings.set(jid, { goodbyeEnabled: enabled });

    await sock.sendMessage(jid, {
      text: enabled
        ? `✅ Goodbye messages *enabled*!\n\nUse *.setgoodbye <msg>* to set a custom message.`
        : `❌ Goodbye messages *disabled*.`,
    }, { quoted: msg });
  },
};
