import { updateBot } from "./gitUpdater.mjs";
import { log } from "./logger.mjs";

export async function autoUpdate() {
  log("info", "Checking for updates…");
  try {
    const result = await updateBot();
    log("info", result.sameRev ? "✅ Bot is already up to date" : "✅ Bot checkout updated. Restart to load changed core modules.");
    return result;
  } catch (error) {
    log("warn", `Auto-update skipped: ${error.message}`);
    return { sameRev: true, error };
  }
}
