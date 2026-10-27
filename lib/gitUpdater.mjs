import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const exec = promisify(execFile);
const DEFAULT_ROOT = fileURLToPath(new URL("../", import.meta.url));
const REPO_URL = "https://github.com/kelin132/furina.git";
const RUNTIME_PATHS = [".env", "sessions", ".bots", "data", "database", "backups"];
const LOCK_WAIT_MS = 10 * 60 * 1000;
const STALE_LOCK_MS = 15 * 60 * 1000;
const LOCK_HEARTBEAT_MS = 20 * 1000;
let pending;

async function exists(file) {
  return fs.access(file).then(() => true, () => false);
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function isStaleLock(lockPath) {
  let info;
  try {
    info = await fs.stat(lockPath);
  } catch (error) {
    return error?.code === "ENOENT";
  }

  const age = Date.now() - info.mtimeMs;
  let owner;
  try {
    owner = JSON.parse(await fs.readFile(path.join(lockPath, "owner.json"), "utf8"));
  } catch {
    // Allow a process that crashed while creating the lock to be recovered.
    return age > 30_000;
  }

  if (age > STALE_LOCK_MS) return true;
  if (owner.hostname !== os.hostname() || !Number.isInteger(owner.pid)) return false;
  try {
    process.kill(owner.pid, 0);
    return false;
  } catch (error) {
    return error?.code === "ESRCH";
  }
}

async function createOwnedLock(lockPath) {
  await fs.mkdir(lockPath);
  const owner = {
    pid: process.pid,
    hostname: os.hostname(),
    token: `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  };
  try {
    await fs.writeFile(path.join(lockPath, "owner.json"), JSON.stringify(owner), { flag: "wx" });
  } catch (error) {
    await fs.rm(lockPath, { recursive: true, force: true });
    throw error;
  }

  const heartbeat = setInterval(() => {
    const now = new Date();
    void fs.utimes(lockPath, now, now).catch(() => {});
  }, LOCK_HEARTBEAT_MS);
  heartbeat.unref?.();

  return async () => {
    clearInterval(heartbeat);
    try {
      const current = JSON.parse(await fs.readFile(path.join(lockPath, "owner.json"), "utf8"));
      if (current.token === owner.token) {
        await fs.rm(lockPath, { recursive: true, force: true });
      }
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  };
}

async function acquireCheckoutLock(lockPath) {
  const reclaimPath = `${lockPath}.reclaim`;
  const deadline = Date.now() + LOCK_WAIT_MS;

  while (Date.now() < deadline) {
    if (await exists(reclaimPath)) {
      if (await isStaleLock(reclaimPath)) {
        await fs.rm(reclaimPath, { recursive: true, force: true }).catch(() => {});
      } else {
        await pause(250);
        continue;
      }
    }

    try {
      return await createOwnedLock(lockPath);
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }

    if (await isStaleLock(lockPath)) {
      try {
        // Serialize stale-lock recovery too; otherwise two workers could each
        // remove the other's newly acquired lock after a crashed update.
        const releaseReclaimer = await createOwnedLock(reclaimPath);
        try {
          if (await isStaleLock(lockPath)) {
            await fs.rm(lockPath, { recursive: true, force: true });
          }
        } finally {
          await releaseReclaimer();
        }
        continue;
      } catch (error) {
        if (error?.code !== "EEXIST") throw error;
      }
    }

    await pause(250);
  }

  throw new Error("Timed out waiting for another update to finish in the shared bot folder.");
}

export async function updateCheckout({ root = DEFAULT_ROOT, remote = REPO_URL, branch = process.env.GITHUB_BRANCH || "main" } = {}) {
  root = path.resolve(root);
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(branch) || branch.includes("..")) {
    throw new Error("Invalid GITHUB_BRANCH.");
  }
  const git = async (...args) => (await exec("git", [
    "-c", `safe.directory=${root}`, "-C", root, ...args,
  ], { timeout: 120_000, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } })).stdout.trim();

  // Check a real repository, not just the existence of a .git directory.
  // Also support worktrees (.git is a file) without adopting a parent repo.
  const localGit = await exists(path.join(root, ".git"));
  if (!localGit) await git("init");
  const actualRoot = await git("rev-parse", "--show-toplevel");
  if (path.resolve(actualRoot) !== root) throw new Error("Git root does not match bot directory.");
  const lockPath = path.resolve(root, await git("rev-parse", "--git-path", "kelin-update-guard"));
  const releaseLock = await acquireCheckoutLock(lockPath);
  try {
  const initialized = !localGit || !(await git("rev-parse", "--verify", "HEAD").catch(() => ""));
  const oldRev = await git("rev-parse", "--verify", "HEAD").catch(() => null);
  if (await git("remote", "get-url", "origin").catch(() => "")) {
    await git("remote", "set-url", "origin", remote);
  } else {
    await git("remote", "add", "origin", remote);
  }
  await git("fetch", "--prune", "origin", `+refs/heads/${branch}:refs/remotes/origin/${branch}`);
  const newRev = await git("rev-parse", "--verify", `refs/remotes/origin/${branch}`);
  const dependencyMarker = path.resolve(root, await git("rev-parse", "--git-path", "kelin-dependencies-pending"));
  const install = async () => {
    await exec("npm", ["install", "--no-audit", "--no-fund", "--prefer-offline"], {
      cwd: root, timeout: 240_000, maxBuffer: 4 * 1024 * 1024,
    });
    await fs.rm(dependencyMarker, { force: true });
  };
  if (oldRev === newRev) {
    if (await exists(dependencyMarker)) await install();
    return { sameRev: true, newRev, oldRev, initialized };
  }
  const dependencyChanged = initialized || !oldRev || Boolean(await git(
    "diff", "--name-only", oldRev, newRev, "--", "package.json", "package-lock.json", "pnpm-lock.yaml",
  ));
  if (dependencyChanged) await fs.writeFile(dependencyMarker, newRev);

  const backup = await fs.mkdtemp(path.join(os.tmpdir(), "kelin-update-"));
  const runtimePaths = [...new Set([
    ...RUNTIME_PATHS,
    ...(await fs.readdir(root)).filter((name) => name.startsWith(".env.")),
  ])];
  const saved = [];
  try {
    // Preserve complete session key stores and local databases, not only creds.json.
    for (const name of runtimePaths) {
      if (!await exists(path.join(root, name))) continue;
      await fs.cp(path.join(root, name), path.join(backup, name), { recursive: true });
      saved.push(name);
    }
    try {
      await git("reset", "--hard", newRev);
      // Do not git clean: hosting panels own untracked config and runtime files.
      // Set a predictable branch/upstream for future panel and command updates.
      await git("checkout", "-B", branch, newRev);
      await git("branch", "--set-upstream-to", `origin/${branch}`, branch);
    } finally {
      for (const name of saved) {
        await fs.cp(path.join(backup, name), path.join(root, name), { recursive: true, force: true });
      }
    }
  } catch (error) {
    // Keep the backup for manual recovery if restoring runtime state fails.
    throw new Error(`Update failed; runtime backup retained at ${backup}`, { cause: error });
  }
  await fs.rm(backup, { recursive: true, force: true });
  if (dependencyChanged || await exists(dependencyMarker)) await install();
  return { sameRev: false, newRev, oldRev: oldRev || "none", initialized };
  } finally {
    await releaseLock();
  }
}

export function updateBot() {
  // Startup and .update share one in-process lock.
  if (!pending) pending = updateCheckout().finally(() => { pending = undefined; });
  return pending;
}
