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
 *  5. Fallback to ZIP download if git fails
 */
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import https from "https";
import { loadPlugins } from "../../lib/pluginManager.mjs";

// Resolve repo root from this file's location (plugins/owner/ → ../../)
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT  = resolve(__dirname, "../..");
let updateInProgress = false;

// ── Shell helper with timeout ────────────────────────────────────────────────

function run(cmd, timeoutMs = 60000) {
    return new Promise((resolve, reject) => {
        const proc = exec(cmd, { windowsHide: true }, (err, stdout, stderr) => {
            if (err) return reject(new Error((stderr || stdout || err.message || '').toString().trim()));
            resolve((stdout || '').toString().trim());
        });
        
        const timeout = setTimeout(() => {
            proc.kill();
            reject(new Error(`Command timeout (${timeoutMs}ms): ${cmd}`));
        }, timeoutMs);
        
        proc.on('exit', () => clearTimeout(timeout));
    });
}

// ── Git helpers ──────────────────────────────────────────────────────────

async function hasGit() {
    try { await run('git --version'); return true; } catch { return false; }
}

async function detectBranch() {
    try {
        const t = (await run(`git -C "${REPO_ROOT}" rev-parse --abbrev-ref --symbolic-full-name @{u}`, 5000)).trim();
        if (t) return t;
    } catch {}
    const b = (process.env.GITHUB_BRANCH || 'main').trim();
    if (b) return `origin/${b}`;
    for (const n of ['main', 'master']) {
        try { await run(`git -C "${REPO_ROOT}" rev-parse origin/${n}`, 5000); return `origin/${n}`; } catch {}
    }
    return 'origin/main';
}

// ── Env + session backup/restore ─────────────────────────────────────────────

function snapshotEnvAndSession() {
    const snap = { env: null, creds: null };
    const envPath   = path.join(REPO_ROOT, '.env');
    const credsPath = path.join(REPO_ROOT, 'sessions', 'auth', 'creds.json');
    
    try { if (fs.existsSync(envPath))   snap.env     = fs.readFileSync(envPath,   'utf8'); } catch (e) {
        console.warn('[update] Could not snapshot .env:', e.message);
    }
    try { if (fs.existsSync(credsPath)) snap.creds   = fs.readFileSync(credsPath, 'utf8'); } catch (e) {
        console.warn('[update] Could not snapshot creds:', e.message);
    }
    
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

const CLEAN_EXCLUDES = [
    "--exclude=.bots",
    "--exclude=.bots/**",
    "--exclude=backups",
    "--exclude=backups/**",
    "--exclude=package-lock.json",
    "--exclude=node_modules",
    "--exclude=data",
    "--exclude=data/**",
    "--exclude=sessions",
    "--exclude=sessions/**",
].join(" ");

async function ensureGitRemote() {
    const remoteUrl = "https://github.com/kelin132/Kelin-MD2.git";
    try {
        await run(`git -C "${REPO_ROOT}" remote get-url origin`, 5000);
        await run(`git -C "${REPO_ROOT}" remote set-url origin ${remoteUrl}`, 5000);
    } catch {
        await run(`git -C "${REPO_ROOT}" remote add origin ${remoteUrl}`, 5000);
    }
}

async function initialiseGitRepo() {
    console.log("[update] No .git folder found — initialising the repository.");
    const snap = snapshotEnvAndSession();

    await run(`git -C "${REPO_ROOT}" init`, 10000);
    await ensureGitRemote();
    await run(`git -C "${REPO_ROOT}" fetch origin main --depth=1`, 30000);
    await run(`git -C "${REPO_ROOT}" reset --hard origin/main`, 15000);
    await run(`git -C "${REPO_ROOT}" clean -fd ${CLEAN_EXCLUDES}`, 10000);
    restoreEnvAndSession(snap);

    const newRev = await run(`git -C "${REPO_ROOT}" rev-parse HEAD`, 5000);
    return { sameRev: false, newRev, oldRev: "none", initialized: true };
}

// ── Update via git (proper method) ────────────────────────────────────────────────

async function updateViaGit() {
    if (!fs.existsSync(path.join(REPO_ROOT, ".git"))) {
        return initialiseGitRepo();
    }

    try {
        await ensureGitRemote();
        const oldRev = (await run(`git -C "${REPO_ROOT}" rev-parse HEAD`, 5000).catch(() => 'unknown'));
        await run(`git -C "${REPO_ROOT}" fetch --all --prune`, 30000);
        const branch = await detectBranch();
        const newRev = await run(`git -C "${REPO_ROOT}" rev-parse ${branch}`, 5000);
        const sameRev = oldRev === newRev;

        if (!sameRev) {
            // Snapshot .env and session before git wipes anything
            const snap = snapshotEnvAndSession();

            await run(`git -C "${REPO_ROOT}" reset --hard ${newRev}`, 15000);
            // Never remove runtime-owned files. In particular, .bots contains
            // live multi-bot credentials that are intentionally untracked by Git.
            await run(`git -C "${REPO_ROOT}" clean -fd ${CLEAN_EXCLUDES}`, 10000);

            // Restore immediately after — before npm install
            restoreEnvAndSession(snap);

            // Only run npm install if package.json actually changed
            try {
                const diff = await run(`git -C "${REPO_ROOT}" diff --name-only ${oldRev} ${newRev} -- package.json`, 5000);
                if (diff.length > 0) {
                    console.log('[update] package.json changed — running npm install');
                    await run(`npm --prefix "${REPO_ROOT}" install --no-audit --no-fund --prefer-offline`, 120000);
                } else {
                    console.log('[update] package.json unchanged — skipping npm install');
                }
            } catch (e) { 
                console.warn('[update] npm install skipped:', e.message);
            }
        }

        return { sameRev, newRev, oldRev };
    } catch (err) {
        throw new Error(`Git update failed: ${err.message}`);
    }
}

// ── Fallback: ZIP download ───────────────────────────────────────────────────

function downloadFile(url) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error("Download timeout"));
        }, 120000); // 2 minute timeout

        https.get(url, { timeout: 60000 }, (res) => {
            if (res.statusCode !== 200) {
                clearTimeout(timeout);
                return reject(new Error(`HTTP ${res.statusCode}`));
            }

            let data = Buffer.alloc(0);
            res.on('data', (chunk) => {
                data = Buffer.concat([data, chunk]);
            });
            res.on('end', () => {
                clearTimeout(timeout);
                resolve(data);
            });
            res.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        }).on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });
    });
}

async function updateViaZip() {
    console.log("[update] Attempting ZIP download fallback...");
    const snap = snapshotEnvAndSession();
    const zipUrl = "https://github.com/kelin132/Kelin-MD2/archive/refs/heads/main.zip";
    
    try {
        // Download ZIP
        const zipData = await downloadFile(zipUrl);
        const zipPath = path.join(REPO_ROOT, "update-temp.zip");
        fs.writeFileSync(zipPath, zipData);
        console.log('[update] ZIP downloaded');

        // Extract (requires unzip command)
        await run(`cd "${REPO_ROOT}" && unzip -q -o update-temp.zip && rm update-temp.zip`, 60000);
        
        // Move files from extracted folder
        const extracted = path.join(REPO_ROOT, "Kelin-MD2-main");
        if (fs.existsSync(extracted)) {
            const files = fs.readdirSync(extracted);
            for (const file of files) {
                const src = path.join(extracted, file);
                const dst = path.join(REPO_ROOT, file);
                if (fs.existsSync(dst)) fs.rmSync(dst, { recursive: true });
                fs.renameSync(src, dst);
            }
            fs.rmSync(extracted, { recursive: true });
        }
        console.log('[update] ZIP extracted');

        // Restore
        restoreEnvAndSession(snap);

        // npm install
        try {
            const diff = await run(`ls package.json`, 5000);
            if (diff) {
                console.log('[update] Running npm install after ZIP update');
                await run(`npm --prefix "${REPO_ROOT}" install --no-audit --no-fund --prefer-offline`, 120000);
            }
        } catch { /* non-fatal */ }

        return { sameRev: false, newRev: "zip-fallback", oldRev: "unknown", fallback: true };
    } catch (err) {
        throw new Error(`ZIP download failed: ${err.message}`);
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

        if (updateInProgress) {
            return sock.sendMessage(jid, {
                text: "⏳ An update is already running. Please wait for it to finish."
            }, { quoted: msg });
        }

        updateInProgress = true;
        try {
            await sock.sendMessage(jid, {
                text: `🔄 *Checking for updates...*\n\nFetching from GitHub…`
            }, { quoted: msg });
        } catch (err) {
            updateInProgress = false;
            throw err;
        }

        try {
            let updateOutput = "";
            let usedFallback = false;

            // ── Step 1: Try git first ────────────────────────────────────────
            if (await hasGit()) {
                try {
                    const { sameRev, newRev, oldRev, initialized } = await updateViaGit();
                    
                    if (sameRev) {
                        return sock.sendMessage(jid, {
                            text: `✅ *Already up to date!*\n\nNo new updates available from GitHub.`
                        }, { quoted: msg });
                    }

                    updateOutput = initialized
                        ? `📥 Repository initialised at: ${newRev?.slice(0, 7)}`
                        : `📥 Pulled from: ${oldRev?.slice(0, 7)} → ${newRev?.slice(0, 7)}`;
                } catch (err) {
                    console.warn('[update] Git failed, trying ZIP fallback:', err.message);
                    usedFallback = true;
                    try {
                        await updateViaZip();
                        updateOutput = `📦 Fallback: ZIP download & extract`;
                    } catch (zipErr) {
                        const detail = (zipErr.message || "").slice(0, 600);
                        return sock.sendMessage(jid, {
                            text: `❌ *Update failed!*\n\nBoth Git and ZIP fallback failed:\n\`\`\`${detail}\`\`\``
                        }, { quoted: msg });
                    }
                }
            } else {
                // Git not available, try ZIP
                try {
                    console.log('[update] Git not available, using ZIP fallback');
                    usedFallback = true;
                    await updateViaZip();
                    updateOutput = `📦 Fallback: ZIP download & extract`;
                } catch (err) {
                    const detail = (err.message || "").slice(0, 600);
                    return sock.sendMessage(jid, {
                        text: `❌ *Git not available and ZIP fallback failed!*\n\n\`\`\`${detail}\`\`\``
                    }, { quoted: msg });
                }
            }

            // ── Step 2: Plugin reload ────────────────────────────────────────────
            await sock.sendMessage(jid, {
                text: `📦 *Updates pulled!* Reloading plugins…`
            }, { quoted: msg });

            try {
                const { totalPlugins, totalCommands } = await loadPlugins(prefix);
                const { reloadAkiraAI } = await import("../../lib/akiraHandler.mjs");
                await reloadAkiraAI();

                await sock.sendMessage(jid, {
                    text:
`✅ *Bot Updated Successfully!*

📥 *Method:*
\`\`\`
${updateOutput}${usedFallback ? ' (Fallback)' : ''}
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
        } finally {
            updateInProgress = false;
        }
    }
};
