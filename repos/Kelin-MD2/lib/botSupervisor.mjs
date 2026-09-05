/**
 * Supervises one worker process per configured bot.
 */
import { spawn } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { loadBotConfigs, getBotConfigSignature } from "./botConfig.mjs";
import { log } from "./logger.mjs";

const WORKER = path.resolve("lib", "botWorker.mjs");
const workers = new Map();
let stopping = false;

function printChildLine(id, chunk, stream = "info") {
  const text = String(chunk).replace(/\r/g, "");
  for (const line of text.split("\n")) {
    if (line.trim()) log(stream, `[bot:${id}] ${line}`);
  }
}

function stopWorker(id, reason = "configuration changed") {
  const state = workers.get(id);
  if (!state) return;
  state.stopping = true;
  workers.delete(id);
  try {
    state.child.kill("SIGTERM");
  } catch (error) {
    log("warn", `[bots] Could not stop ${id}: ${error.message}`);
  }
  log("info", `[bots] Stopped ${id} (${reason})`);
}

function startWorker(definition, scheduledJobs = false) {
  if (!existsSync(WORKER)) {
    throw new Error(`Worker entry point not found: ${WORKER}`);
  }

  const id = definition.id;
  const signature = getBotConfigSignature(definition);
  const child = spawn(process.execPath, [WORKER], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      BOT_DEFINITION_JSON: JSON.stringify(definition),
      ...(scheduledJobs ? { RUN_SCHEDULED_JOBS: "1" } : {}),
    },
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  });

  const state = { child, signature, stopping: false, scheduledJobs };
  workers.set(id, state);

  child.stdout.on("data", (chunk) => printChildLine(id, chunk, "info"));
  child.stderr.on("data", (chunk) => printChildLine(id, chunk, "warn"));
  child.on("error", (error) => log("error", `[bots:${id}] Worker error: ${error.message}`));
  child.on("exit", (code, signal) => {
    const current = workers.get(id);
    if (current?.child === child) workers.delete(id);
    if (stopping || state.stopping) return;

    const exitReason = signal || (code ?? "unknown");
    log("warn", `[bots:${id}] Worker exited (${exitReason}); restarting in 5s`);
    setTimeout(() => {
      if (stopping) return;
      const latest = loadBotConfigs().find((item) => item.id === id);
      if (latest) startWorker(latest, false);
    }, 5_000).unref?.();
  });

  log("info", `[bots] Started ${id} (pid ${child.pid})`);
}

function syncWorkers() {
  const definitions = loadBotConfigs();
  const current = new Map(definitions.map((definition) => [definition.id, definition]));

  for (const [id, state] of workers) {
    const definition = current.get(id);
    if (!definition) {
      stopWorker(id, "removed or disabled");
      continue;
    }

    const signature = getBotConfigSignature(definition);
    if (signature !== state.signature) {
      stopWorker(id, "configuration changed");
      startWorker(definition, false);
    }
  }

  let scheduledJobsAssigned = [...workers.values()].some(
    (state) => state.scheduledJobs === true,
  );
  for (const definition of definitions) {
    if (workers.has(definition.id)) continue;
    const scheduledJobs = !scheduledJobsAssigned;
    startWorker(definition, scheduledJobs);
    scheduledJobsAssigned ||= scheduledJobs;
    const state = workers.get(definition.id);
    if (state) state.scheduledJobs = scheduledJobs;
  }
}

export async function startBotSupervisor() {
  log("info", "[bots] Starting one isolated worker for every valid bot definition");
  syncWorkers();

  // Polling is intentional: it works on panel-mounted volumes where fs.watch
  // often misses atomic uploads and renames. There is no two-bot limit.
  const timer = setInterval(syncWorkers, 5_000);
  timer.unref?.();

  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    clearInterval(timer);
    for (const id of [...workers.keys()]) stopWorker(id, "supervisor shutdown");
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}