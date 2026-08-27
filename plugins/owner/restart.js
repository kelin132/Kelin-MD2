/**
 * KELIN MD — .restart
 * Sends a confirmation message then exits the process cleanly.
 * PM2 / forever / systemd / panel-watchers will auto-restart the bot.
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
    await new Promise(r => setTimeout(r, 2000));

    console.log("[restart] Owner triggered a restart — exiting process to trigger auto-restart...");

    // On many panels (Katabump, Render, Pterodactyl), the container 
    // is configured to restart whenever the process exits.
    // Exit code 0 is a clean exit.
    process.exit(0);
  },
};
