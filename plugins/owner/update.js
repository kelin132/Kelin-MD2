/**
 * KELIN MD — .update command
 * Pulls the latest code from GitHub with proper git handling
 * Snapshot + restore .env and session to survive container resets
 * Then hot-reloads all plugins without a full restart.
 * 
 * Strategy:
 *  1. git fetch → compare revisions → reset --hard
 *     (Avoids git merge conflicts and compare errors)
 *  2. Snapshot .env and session before git wipes anything
 *  3. Restore .env and session after git operations
 *  4. Hot-reload plugins (no restart needed)
 */
import { exec } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from "fs";
import path from "path";
import { loadPlugins } from "../../lib/pluginManager.mjs";

const execAsync = promisify(exec);

// Resolve repo root from this file's location (plugins/owner/ → ../../)
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT  = resolve(__dirname, "../..");

// ── Shell helper ─────────────────────────────────────────────────────────

function run(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, { windowsHide: true }, (err, stdout, stderr) => {
            if (err) return reject(new Error((stderr || stdout || err.message || '').toString().trim()));
            resolve((stdout || '').toString().trim());
        });
    });
}

// ── Git helpers ──────────────────────────────────────────────────────────

async function hasGit() {
    if (!fs.existsSync(path.join(REPO_ROOT, '.git'))) return false;
    try { await run('git --version'); return true; } catch { return false; }
}

async function detectBranch() {
    try {
        const t = (await run(`git -C "${REPO_ROOT}" rev-parse --abbrev-ref --symbolic-full-name @{u}`)).trim();
        if (t) return t;
    } catch {}
    const b = (process.env.GITHUB_BRANCH || 'main').trim();
    if (b) return `origin/${b}`;
    for (const n of ['main', 'master']) {
        try { await run(`git -C "${REPO_ROOT}" rev-parse origin/${n}`); return `origin/${n}`; } catch {}
    }
    return 'origin/main';
}

// ── Env + session backup/restore ─────────────────────────────────────────────

function snapshotEnvAndSession() {
    const snap = { env: null, creds: null };
    const envPath   = path.join(REPO_ROOT, '.env');
    const credsPath = path.join(REPO_ROOT, 'sessions', 'auth', 'creds.json');
    
    try { if (fs.existsSync(envPath))   snap.env     = fs.readFileSync(envPath,   'utf8'); } catch {}
    try { if (fs.existsSync(credsPath)) snap.creds   = fs.readFileSync(credsPath, 'utf8'); } catch {}
    
    return snap;
}

function restoreEnvAndSession(snap) {
    const envPath    = path.join(REPO_ROOT, '.env');
    const sessionDir = path.join(REPO_ROOT, 'sessions', 'auth');
    const credsPath  = path.join(sessionDir, 'creds.json');

    try {
        if (snap.env !== null) {
            fs.writeFileSync(envPath, snap.env, 'utf8');
            console.log('[update] .env restored ✅');
        }
    } catch (e) {
        console.error('[update] Failed to restore .env:', e.message);
    }

    try {
        if (snap.creds !== null) {
            if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });
            fs.writeFileSync(credsPath, snap.creds, 'utf8');
            console.log('[update] sessions/auth/creds.json restored ✅');
        }
    } catch (e) {
        console.error('[update] Failed to restore sessions/auth/creds.json:', e.message);
    }
}

// ── Update via git (proper method) ────────────────────────────────────────────────

async function updateViaGit() {
    try {
        const oldRev = (await run(`git -C "${REPO_ROOT}" rev-parse HEAD`).catch(() => 'unknown'));
        await run(`git -C "${REPO_ROOT}" fetch --all --prune`);
        const branch = await detectBranch();
        const newRev = await run(`git -C "${REPO_ROOT}" rev-parse ${branch}`);
        const sameRev = oldRev === newRev;

        if (!sameRev) {
            // Snapshot .env and session before git wipes anything
            const snap = snapshotEnvAndSession();

            await run(`git -C "${REPO_ROOT}" reset --hard ${newRev}`);
            await run(`git -C "${REPO_ROOT}" clean -fd --exclude=package-lock.json --exclude=node_modules --exclude=data --exclude=sessions`);

            // Restore immediately after — before npm install
            restoreEnvAndSession(snap);

            // Only run npm install if package.json actually changed
            try {
                const diff = await run(`git -C "${REPO_ROOT}" diff --name-only ${oldRev} ${newRev} -- package.json`);
                if (diff.length > 0) {
                    console.log('[update] package.json changed — running npm install');
                    await run(`npm --prefix "${REPO_ROOT}" install --no-audit --no-fund --prefer-offline`);
                } else {
                    console.log('[update] package.json unchanged — skipping npm install');
                }
            } catch { /* non-fatal */ }
        }

        return { sameRev, newRev, oldRev };
    } catch (err) {
        throw new Error(`Git update failed: ${err.message}`);
    }
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
            text: `🔄 *Checking for updates...*\n\nFetching from GitHub…`
        }, { quoted: msg });

        try {
            // Check if git is available
            if (!(await hasGit())) {
                return sock.sendMessage(jid, {
                    text: `❌ *Git not available!*\n\nMake sure .git folder exists and git is installed.`
                }, { quoted: msg });
            }

            // ── Step 1: git fetch + reset ────────────────────────────────────────
            let updateOutput = "";
            try {
                const { sameRev, newRev, oldRev } = await updateViaGit();
                
                if (sameRev) {
                    return sock.sendMessage(jid, {
                        text: `✅ *Already up to date!*\n\nNo new updates available from GitHub.`
                    }, { quoted: msg });
                }

                updateOutput = `📥 Pulled from: ${oldRev?.slice(0, 7)} → ${newRev?.slice(0, 7)}`;
            } catch (err) {
                const detail = (err.message || "").slice(0, 600);
                return sock.sendMessage(jid, {
                    text: `❌ *Git update failed!*\n\n\`\`\`${detail}\`\`\``
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
                installOutput = stdout?.trim() || "Dependencies installed";
            } catch (err) {
                // Non-fatal — log but continue to plugin reload
                installOutput = `⚠️ npm install had warnings:\n${(err.message || "").slice(0, 300)}`;
            }

            // ── Step 3: hot-reload plugins ────────────────────────────────────────
            try {
                const { totalPlugins, totalCommands } = await loadPlugins(prefix);

                await sock.sendMessage(jid, {
                    text:
`✅ *Bot Updated Successfully!*

📥 *Git:*
\`\`\`
${updateOutput}
\`\`\`

📦 *Dependencies:*
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
                        `⚠️ *Updated but plugin reload failed:*\n\n${err.message}\n\n` +
                        `Restart the bot to apply changes.`
                }, { quoted: msg });
            }

        } catch (err) {
            console.error('[update] Error:', err.message);
            await sock.sendMessage(jid, {
                text: `❌ *Update error:*\n${err.message}`,
                quoted: msg
            });
        }
    }
};
