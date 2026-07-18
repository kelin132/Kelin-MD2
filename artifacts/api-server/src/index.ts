import app from "./app.js";
import { logger } from "./lib/logger.js";
import { connectBot } from "./lib/bot.js";
import { loadPlugins } from "./lib/pluginManager.js";
import { botLog } from "./lib/logBuffer.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "KELIN MD API Server listening");
  botLog("info", `KELIN MD API Server started on port ${port}`);

  // Load plugins
  try {
    await loadPlugins();
  } catch (e) {
    logger.warn({ err: e }, "Plugin load warning");
  }

  // Auto-connect if session exists
  try {
    const { hasSession } = await import("./lib/bot.js");
    if (hasSession()) {
      botLog("info", "Existing session found — connecting...");
      connectBot().catch((e) => logger.error({ err: e }, "Auto-connect failed"));
    } else {
      botLog("info", "No session found — visit dashboard to pair");
    }
  } catch (e) {
    logger.warn({ err: e }, "Session check warning");
  }
});
