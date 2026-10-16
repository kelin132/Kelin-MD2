import { exec } from "child_process";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from "fs";
import path from "path";
import { log } from "./logger.mjs";

// Resolve repo root regardless of cwd
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

const REPO_URL = "https://github.com/kelin132/Kelin-MD2.git";
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

function run(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, { windowsHide: true }, (err, stdout, stderr) => {
            if (err) return reject(new Error((stderr || stdout || err.message || '').toString().trim()));
            resolve((stdout || '').toString().trim());
        });
    });
}

function quoteShellArg(value) {
    return `'${String(value).replaceAll("'", "'\\''")}'`;
}

export function getUpdateBranch(value = process.env.GITHUB_BRANCH || "main") {
    const branch = String(value).trim()
        .replace(/^refs\/heads\//, "")
        .replace(/^origin\//, "");
    const segments = branch.split("/");
    if (
        !/^[A-Za-z0-9._/-]+$/.test(branch) ||
        branch.includes("..") ||
        branch.includes("//") ||
        branch.endsWith("/") ||
        branch.endsWith(".") ||
        segments.some((segment) => !segment || segment.startsWith(".") || segment.endsWith(".lock"))
    ) {
        throw new Error("Invalid GITHUB_BRANCH; use a valid branch name such as main.");
    }
    return branch;
}

export async function ensureGitRemote(repoRoot = REPO_ROOT, remoteUrl = REPO_URL) {
    const root = quoteShellArg(repoRoot);
    const currentUrl = await run(`git -C ${root} remote get-url origin`).catch(() => "");
    if (!currentUrl) {
        await run(`git -C ${root} remote add origin ${quoteShellArg(remoteUrl)}`);
    } else if (currentUrl !== remoteUrl) {
        await run(`git -C ${root} remote set-url origin ${quoteShellArg(remoteUrl)}`);
    }
}

function snapshotEnvAndSession(repoRoot = REPO_ROOT) {
    const snap = { env: null, creds: null };
    const envPath   = path.join(repoRoot, '.env');
    const credsPath = path.join(repoRoot, 'sessions', 'auth', 'creds.json');
    try { if (fs.existsSync(envPath))   snap.env   = fs.readFileSync(envPath,   'utf8'); } catch {}
    try { if (fs.existsSync(credsPath)) snap.creds = fs.readFileSync(credsPath, 'utf8'); } catch {}
    return snap;
}

function restoreEnvAndSession(snap, repoRoot = REPO_ROOT) {
    const envPath    = path.join(repoRoot, '.env');
    const sessionDir = path.join(repoRoot, 'sessions', 'auth');
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

/**
 * If no .git folder exists, initialise one in-place so future updates work.
 * Preserves .env and sessions/auth/creds.json across the reset.
 */
async function initGitRepo() {
    log("info", "[update] No .git folder found — initialising git repo…");

    const snap = snapshotEnvAndSession();
    const branch = getUpdateBranch();
    const root = quoteShellArg(REPO_ROOT);
    const remoteRef = `refs/remotes/origin/${branch}`;
    const refspec = `+refs/heads/${branch}:${remoteRef}`;

    await run(`git -C ${root} init`);
    await ensureGitRemote(REPO_ROOT);
    await run(`git -C ${root} fetch --depth=1 origin ${quoteShellArg(refspec)}`);
    await run(`git -C ${root} reset --hard ${quoteShellArg(remoteRef)}`);
    await run(`git -C ${root} clean -fd ${CLEAN_EXCLUDES}`);

    restoreEnvAndSession(snap);

    log("info", "[update] ✅ Git repo initialised — auto-update is now active.");
}

export async function updateViaGit({
    repoRoot = REPO_ROOT,
    remoteUrl = REPO_URL,
    branch = getUpdateBranch(),
} = {}) {
    const root = quoteShellArg(repoRoot);
    const targetBranch = getUpdateBranch(branch);
    const remoteRef = `refs/remotes/origin/${targetBranch}`;
    const refspec = `+refs/heads/${targetBranch}:${remoteRef}`;
    const oldRev = (await run(`git -C ${root} rev-parse HEAD`).catch(() => 'unknown'));
    await ensureGitRemote(repoRoot, remoteUrl);
    // Fetch only the configured upstream. A stale or inaccessible extra remote
    // must not make the server skip updates from this repository.
    await run(`git -C ${root} fetch --prune origin ${quoteShellArg(refspec)}`);
    const newRev = await run(`git -C ${root} rev-parse ${quoteShellArg(remoteRef)}`);
    const sameRev = oldRev === newRev;

    if (!sameRev) {
        const snap = snapshotEnvAndSession(repoRoot);

        // Use reset --hard instead of pull — avoids merge conflicts
        await run(`git -C ${root} reset --hard ${newRev}`);
        await run(`git -C ${root} clean -fd ${CLEAN_EXCLUDES}`);

        restoreEnvAndSession(snap, repoRoot);

        try {
            const diff = await run(`git -C ${root} diff --name-only ${oldRev} ${newRev} -- package.json`);
            if (diff.length > 0) {
                log("info", '[update] package.json changed — running npm install');
                await run(`npm --prefix ${root} install --no-audit --no-fund --prefer-offline`);
            } else {
                log("info", '[update] package.json unchanged — skipping npm install');
            }
        } catch { /* non-fatal */ }
    }

    return { sameRev, newRev };
}

export async function autoUpdate() {
    log("info", "Checking for updates…");

    try {
        // Auto-initialise git if the folder is missing. This is awaited by the
        // entry point before plugins load, so a freshly pulled checkout cannot
        // start with an older module graph.
        if (!fs.existsSync(path.join(REPO_ROOT, '.git'))) {
            await initGitRepo();
            return { sameRev: false, initialized: true };
        }

        const result = await updateViaGit();
        if (result.sameRev) {
            log("info", "✅ Bot is already up to date");
        } else {
            log("info", "✅ Bot updated from GitHub before plugin loading.");
        }
        return result;
    } catch (err) {
        log("warn", `Auto-update skipped: ${(err.message || '').split("\n")[0]}`);
        return { sameRev: true, error: err };
    }
}
