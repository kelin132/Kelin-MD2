/**
 * KELIN MD — .restart
 * Sends a confirmation message then exits the process cleanly.
 * PM2 / forever / systemd will auto-restart the bot.
 * Owner / staff only.
 */

export default {
  name: "restart",
  aliases: ["reboot", "rs"],
  description: "Restart the bot process (owner only)",
  category: "owner",
  usage: ".restart",
  isStaff: true,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;

    await sock.sendMessage(jid, {
      text:
`╭━━━〔 🔄 *RESTARTING BOT* 〕━━━╮
│
│  ⚡ Bot is restarting…
│  Please wait a few seconds.
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
    }, { quoted: msg });

    // Small delay so the message is delivered before the process exits
    await new Promise(r => setTimeout(r, 1500));

    console.log("[restart] Owner triggered a restart — exiting now.");
    process.exit(0);
  },
};
