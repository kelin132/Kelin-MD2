import { execSync } from "child_process";

export default {
  name: "update",
  description: "Pull latest code from GitHub and restart the bot",
  category: "owner",
  usage: ".update",
  aliases: ["pull", "upgrade"],
  cooldown: 30,
  isOwner: true,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    await sock.sendMessage(jid, { text: "🔄 Checking for updates..." }, { quoted: msg });

    try {
      // Fetch latest from origin
      execSync("git fetch origin", { stdio: "pipe" });

      // Check if we're behind
      const status = execSync("git status -uno", { encoding: "utf8" });
      if (status.includes("up to date")) {
        return sock.sendMessage(jid, { text: "✅ Bot is already up to date!" }, { quoted: msg });
      }

      await sock.sendMessage(jid, { text: "📥 Update found! Applying..." });

      // Hard reset to remote branch (handles conflicts cleanly)
      const branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
      execSync(`git reset --hard origin/${branch}`, { stdio: "pipe" });

      // Reinstall dependencies
      await sock.sendMessage(jid, { text: "📦 Installing dependencies..." });
      execSync("npm install --legacy-peer-deps 2>&1", { stdio: "pipe" });

      await sock.sendMessage(jid, { text: "✅ Update complete! Restarting bot..." });
      setTimeout(() => process.exit(0), 2_000); // Panel/PM2 will auto-restart
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ Update failed: ${err.message}` }, { quoted: msg });
    }
  },
};
