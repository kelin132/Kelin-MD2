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
    await new Promise(r => setTimeout(r, 2000));

    console.log("[restart] Owner triggered a restart — attempting to reboot...");

    try {
      const { spawn } = await import("child_process");
      const child = spawn(process.argv[0], process.argv.slice(1), {
        detached: true,
        stdio: "inherit",
      });
      child.unref();
      process.exit(0);
    } catch (err) {
      console.error("[restart] Failed to spawn new process:", err);
      // Fallback: Exit with non-zero code to trigger panel auto-restart
      process.exit(1);
    }
  },
};
