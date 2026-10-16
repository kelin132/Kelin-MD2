import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("multi-bot startup updates once and leaves index setup to the parent", async () => {
  const [entrypoint, worker, mongo] = await Promise.all([
    readFile(resolve(repoRoot, "index.js"), "utf8"),
    readFile(resolve(repoRoot, "lib/bot-worker.mjs"), "utf8"),
    readFile(resolve(repoRoot, "lib/mongo.mjs"), "utf8"),
  ]);
  const multiBotStart = entrypoint.slice(
    entrypoint.indexOf("if (multiBotMode)"),
    entrypoint.indexOf("} else {", entrypoint.indexOf("if (multiBotMode)")),
  );

  assert.match(multiBotStart, /await autoUpdate\(\)[\s\S]*await connectDb\(\)[\s\S]*await startBotSupervisor\(\)/);
  assert.equal((multiBotStart.match(/autoUpdate\(\)/g) || []).length, 1);
  assert.doesNotMatch(worker, /autoUpdate|updater\.js/);
  assert.match(mongo, /const IS_BOT_WORKER = Boolean\(process\.env\.BOT_CONFIG_JSON\)/);
  assert.match(mongo, /if \(!IS_BOT_WORKER\)\s*\{\s*await ensurePerformanceIndexes\(db\);\s*\}/);
});
