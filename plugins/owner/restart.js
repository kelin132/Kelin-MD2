/**
 * KELIN MD — .restart
 * The hosting panel owns the process lifecycle. Do not call process.exit()
 * from a WhatsApp command because many panels do not automatically respawn it.
 */
export default {
  name: "restart",
  aliases: ["reboot", "rs"],
  description: "Refresh bot status without taking the process offline",
  category: "owner",
  usage: ".restart",
  isStaff: true,
  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    if (!jid) return;
    return sock.sendMessage(jid, {
      text:
`╭━━━〔 🔄 *BOT STATUS* 〕━━━╮
│
│  ⚡ No restart needed!
│  The bot is still running normally.
│
│  Use your hosting panel's restart button
│  when a full process restart is required.
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
    }, { quoted: msg });
  },
};
