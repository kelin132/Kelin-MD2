/**
 * .staffimmunity @user [on|off]
 * Toggle staff immunity — immune players cannot be jailed or robbed.
 * Only staff+ can grant immunity.
 */
import { setStaffImmunity, getUser, isRegistered } from "../economy/database.js";

export default {
  name: "staffimmunity",
  description: "Toggle staff immunity (immune to jail and rob)",
  category: "staff",
  usage: ".staffimmunity @user [on|off]",
  aliases: ["immunity", "setimmunity"],
  isStaff: true,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    let targetJid = null;

    if (mentioned) {
      targetJid = mentioned;
    } else if (args[0]?.match(/^[0-9]+$/)) {
      targetJid = `${args[0]}@s.whatsapp.net`;
    } else {
      return sock.sendMessage(jid, {
        text: "❓ *Usage:* `.staffimmunity @user [on|off]`\n\n_Default is 'on' if not specified._"
      }, { quoted: msg });
    }

    if (!await isRegistered(targetJid)) {
      return sock.sendMessage(jid, { text: "❌ That player is not registered." }, { quoted: msg });
    }

    const toggle = (args[args.length - 1] || "on").toLowerCase();
    const value  = toggle !== "off";
    const target = await getUser(targetJid);

    await setStaffImmunity(targetJid, value);

    await sock.sendMessage(jid, {
      text:
        `🛡️ *Staff Immunity ${value ? "Enabled" : "Disabled"}*\n\n` +
        `👤 Player   : ${target.name}\n` +
        `🔰 Immunity : ${value ? "✅ ON — cannot be jailed or robbed" : "❌ OFF — normal player rules apply"}`,
      mentions: [targetJid],
    }, { quoted: msg });
  }
};
