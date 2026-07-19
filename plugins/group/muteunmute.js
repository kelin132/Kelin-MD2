/**
 * KELIN MD — .mute / .unmute
 * Lock or unlock the group so only admins can send messages.
 */
export default {
  name: "mute",
  description: "Lock the group (admins only can send)",
  category: "group",
  usage: ".mute | .unmute",
  aliases: ["unmute", "lockgroup", "unlockgroup"],
  cooldown: 5,
  isAdmin: true,

  async run({ sock, msg, cmd }) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith("@g.us")) {
      return sock.sendMessage(jid, {
        text: "❌ This command can only be used in groups.",
      }, { quoted: msg });
    }

    const isMute = cmd === "mute" || cmd === "lockgroup";

    try {
      await sock.groupSettingUpdate(jid, isMute ? "announcement" : "not_announcement");
      return sock.sendMessage(jid, {
        text: isMute
          ? "🔇 *Group muted!*\nOnly admins can send messages now."
          : "🔊 *Group unmuted!*\nAll members can send messages now.",
      }, { quoted: msg });
    } catch {
      return sock.sendMessage(jid, {
        text: `❌ Failed to ${isMute ? "mute" : "unmute"} the group. Make sure I'm an admin.`,
      }, { quoted: msg });
    }
  },
};
