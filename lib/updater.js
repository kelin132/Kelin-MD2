import { exec } from "child_process";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from "fs";
import path from "path";
import { log } from "./logger.mjs";

// Resolve repo root regardless of cwd
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

function run(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, { windowsHide: true }, (err, stdout, stderr) => {
            if (err) return reject(new Error((stderr || stdout || err.message || '').toString().trim()));
            resolve((stdout || '').toString().trim());
        });
    });
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
            log("info", '[update] .env restored ✅');
        }
    } catch (e) {
        log("error", '[update] Failed to restore .env: ' + e.message);
    }

    try {
        if (snap.creds !== null) {
            if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });
            fs.writeFileSync(credsPath, snap.creds, 'utf8');
            log("info", '[update] sessions/auth/creds.json restored ✅');
        }
    } catch (e) {
        log("error", '[update] Failed to restore sessions/auth/creds.json: ' + e.message);
    }
}

async function updateViaGit() {
    const oldRev = (await run(`git -C "${REPO_ROOT}" rev-parse HEAD`).catch(() => 'unknown'));
    await run(`git -C "${REPO_ROOT}" fetch --all --prune`);
    const branch = await detectBranch();
    const newRev = await run(`git -C "${REPO_ROOT}" rev-parse ${branch}`);
    const sameRev = oldRev === newRev;

    if (!sameRev) {
        const snap = snapshotEnvAndSession();
        
        // Use reset --hard instead of pull — avoids merge conflicts
        await run(`git -C "${REPO_ROOT}" reset --hard ${newRev}`);
        await run(`git -C "${REPO_ROOT}" clean -fd --exclude=package-lock.json --exclude=node_modules --exclude=data --exclude=sessions`);
        
        restoreEnvAndSession(snap);

        try {
            const diff = await run(`git -C "${REPO_ROOT}" diff --name-only ${oldRev} ${newRev} -- package.json`);
            if (diff.length > 0) {
                log("info", '[update] package.json changed — running npm install');
                await run(`npm --prefix "${REPO_ROOT}" install --no-audit --no-fund --prefer-offline`);
            } else {
                log("info", '[update] package.json unchanged — skipping npm install');
            }
        } catch { /* non-fatal */ }
    }

    return { sameRev, newRev };
}

export function autoUpdate() {
    log("info", "Checking for updates…");

    (async () => {
        try {
            if (!fs.existsSync(path.join(REPO_ROOT, '.git'))) {
                log("warn", "No .git folder found — skipping auto-update");
                return;
            }

            const { sameRev } = await updateViaGit();
            
            if (sameRev) {
                log("info", "✅ Bot is already up to date");
            } else {
                log("info", "✅ Bot updated from GitHub! Restart to apply changes.");
            }
        } catch (err) {
            log("warn", `Auto-update skipped: ${(err.message || '').split("\n")[0]}`);
        }
    })();
}
