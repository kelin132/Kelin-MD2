import { spawn } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { loadBotConfigs } from "./botConfig.mjs";
import { log } from "./logger.mjs";

const workerPath = path.resolve("lib", "bot-worker.mjs");
const workers = new Map();
const blockedWorkers = new Map();
let reconcileTimer = null;
let stopping = false;

function configKey(config) {
  return JSON.stringify({
    id: config.id,
    sessionFolder: config.sessionFolder,
    phoneNumber: config.phoneNumber,
    ownerNumber: config.ownerNumber,
    ownerName: config.ownerName,
    botName: config.botName,
    prefix: config.prefix,
    enabled: config.enabled,
  });
}

function stopWorker(id, reason = "configuration change") {
  const current = workers.get(id);
  if (!current) return;
  log("info", `[bots] Stopping ${id}: ${reason}`);
  current.child.kill("SIGTERM");
  workers.delete(id);
}

function startWorker(config) {
  if (stopping) return;
  const existing = workers.get(config.id);
  const key = configKey(config);
  if (blockedWorkers.get(config.id) === key) return;
  if (blockedWorkers.has(config.id)) blockedWorkers.delete(config.id);
  if (existing?.key === key && !existing.child.killed) return;
  if (existing) stopWorker(config.id);

  if (!existsSync(workerPath)) {
    throw new Error(`Bot worker not found: ${workerPath}`);
  }

  const child = spawn(process.execPath, [workerPath], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      BOT_CONFIG_JSON: JSON.stringify(config),
    },
    stdio: "inherit",
  });

  workers.set(config.id, { child, key });
  log("info", `[bots] Started ${config.id} (pid ${child.pid})`);

  child.once("exit", (code, signal) => {
    const current = workers.get(config.id);
    if (current?.child === child) workers.delete(config.id);
    if (code === 42) {
      blockedWorkers.set(config.id, key);
      log(
        "error",
        `[bots] ${config.id} is paused after WhatsApp replaced its session. Remove the duplicate process/session, then change or restart this bot.`,
      );
    } else if (!stopping && code !== 0 && signal !== "SIGTERM") {
      log("warn", `[bots] ${config.id} stopped (code ${code ?? "?"}); it will be restarted on the next scan.`);
    }
  });

  child.once("error", (error) => {
    log("error", `[bots] ${config.id} worker error: ${error.message}`);
  });
}

function reconcile() {
  if (stopping) return;
  const configs = loadBotConfigs();
  const activeIds = new Set(configs.map((config) => config.id));

  for (const id of workers.keys()) {
    if (!activeIds.has(id)) {
      stopWorker(id, "bot definition removed or disabled");
      blockedWorkers.delete(id);
    }
  }
  for (const config of configs) startWorker(config);

  if (!configs.length) {
    log("warn", "[bots] No bots found. Add a credential folder under .bots/<id>/.");
  }
}

export async function startBotSupervisor() {
  reconcile();
  reconcileTimer = setInterval(reconcile, 10_000);
  log("info", "[bots] Watching .bots/ for new, changed, or disabled bot definitions.");

  const stopAll = () => {
    if (stopping) return;
    stopping = true;
    if (reconcileTimer) clearInterval(reconcileTimer);
    for (const id of workers.keys()) stopWorker(id, "server shutdown");
  };

  process.once("SIGINT", stopAll);
  process.once("SIGTERM", stopAll);
}