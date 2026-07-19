/**
 * KELIN MD — .update command
 * Pulls the latest code from https://github.com/kelin132/Kelin-MD2.git
 * then hot-reloads all plugins without a full restart.
 */
import { exec } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { loadPlugins } from "../../lib/pluginManager.mjs";

const execAsync = promisify(exec);

// Resolve repo root from this file's location (plugins/owner/ → ../../)
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT  = resolve(__dirname, "../..");

function buildPullCmd() {
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    // Authenticated pull — works without any local git credential config
    return `git -C "${REPO_ROOT}" pull https://${token}@github.com/kelin132/Kelin-MD2.git main`;
  }
  return `git -C "${REPO_ROOT}" pull origin main`;
}

export default {
  name: "update",
  description: "Pull latest updates from GitHub and reload plugins (no restart needed)",
  category: "owner",
  usage: ".update",
  aliases: ["pull", "gitpull"],
  isOwner: true,
  cooldown: 30,

  async run({ sock, msg, prefix }) {
    const jid = msg.key.remoteJid;

    await sock.sendMessage(jid, {
      text: `🔄 *Checking for updates...*\n\nPulling from GitHub…`
    }, { quoted: msg });

    // ── Step 1: git pull ─────────────────────────────────────────────────
    let pullOutput = "";
    try {
      const { stdout, stderr } = await execAsync(buildPullCmd(), {
        timeout: 30_000,
      });
      pullOutput = stdout?.trim() || stderr?.trim() || "No output";
    } catch (err) {
      const detail = (err.stderr || err.message || "").slice(0, 600);
      return sock.sendMessage(jid, {
        text: `❌ *Git pull failed!*\n\n\`\`\`${detail}\`\`\``
      }, { quoted: msg });
    }

    if (pullOutput.includes("Already up to date")) {
      return sock.sendMessage(jid, {
        text: `✅ *Already up to date!*\n\nNo new updates from GitHub.`
      }, { quoted: msg });
    }

    // ── Step 2: install any new dependencies ─────────────────────────────
    await sock.sendMessage(jid, {
      text: `📦 *Updates pulled!* Installing dependencies…`
    }, { quoted: msg });

    let installOutput = "";
    try {
      const { stdout } = await execAsync(
        `npm install --legacy-peer-deps 2>&1`,
        { cwd: REPO_ROOT, timeout: 60_000 }
      );
      installOutput = stdout?.trim() || "Done";
    } catch (err) {
      // Non-fatal — log but continue to plugin reload
      installOutput = `⚠️ pnpm install had warnings:\n${(err.stderr || err.message).slice(0, 300)}`;
    }

    // ── Step 3: hot-reload plugins ────────────────────────────────────────
    try {
      const { totalPlugins, totalCommands } = await loadPlugins(prefix);

      await sock.sendMessage(jid, {
        text:
`✅ *Bot Updated Successfully!*

📥 *Pull output:*
\`\`\`
${pullOutput.slice(0, 400)}
\`\`\`

📦 *Install:*
\`\`\`
${installOutput.slice(0, 200)}
\`\`\`

🔌 *Plugins reloaded:*
• ${totalPlugins} plugins loaded
• ${totalCommands} commands active

> ⚡ No restart needed!`
      }, { quoted: msg });

    } catch (err) {
      await sock.sendMessage(jid, {
        text:
          `⚠️ *Pulled but plugin reload failed:*\n\n${err.message}\n\n` +
          `Restart the bot to apply changes.`
      }, { quoted: msg });
    }
  }
};
