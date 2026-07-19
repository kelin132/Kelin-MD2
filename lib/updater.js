import { exec } from "child_process";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { log } from "./logger.mjs";

// Resolve repo root regardless of cwd
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

function buildPullCmd() {
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    return `git -C "${REPO_ROOT}" pull https://${token}@github.com/kelin132/Kelin-MD2.git main`;
  }
  return `git -C "${REPO_ROOT}" pull origin main`;
}

export function autoUpdate() {
  log("info", "Checking for updates...");

  exec(buildPullCmd(), { timeout: 30_000 }, (error, stdout, stderr) => {
    if (stdout?.includes("Already up to date")) {
      log("info", "✅ Bot is already up to date");
      return;
    }
    if (error) {
      log("warn", `Auto-update skipped: ${(stderr || error.message).split("\n")[0]}`);
      return;
    }
    log("info", "✅ Bot updated from GitHub!");
    if (stdout?.trim()) log("info", stdout.trim());
  });
}
