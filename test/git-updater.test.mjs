import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { updateCheckout } from "../lib/gitUpdater.mjs";

test("archive installations bootstrap Git and keep complete runtime state across updates", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "kelin-git-test-"));
  const remote = path.join(temporary, "remote");
  const root = path.join(temporary, "archive");
  const git = (...args) => execFileSync("git", ["-C", remote, ...args], { encoding: "utf8" }).trim();
  try {
    await fs.mkdir(remote);
    await fs.mkdir(root);
    git("init", "-b", "main");
    git("config", "user.name", "Test");
    git("config", "user.email", "test@example.invalid");
    await fs.writeFile(path.join(remote, "package.json"), '{"name":"update-fixture","version":"1.0.0"}');
    await fs.writeFile(path.join(remote, "bot.js"), "version one");
    await fs.mkdir(path.join(remote, "sessions", "auth"), { recursive: true });
    await fs.writeFile(path.join(remote, "sessions", "placeholder"), "upstream");
    await fs.writeFile(path.join(remote, "sessions", "auth", "creds.json"), "upstream placeholder");
    await fs.mkdir(path.join(remote, "database"));
    await fs.writeFile(path.join(remote, "database", "users.json"), "{}");
    git("add", ".");
    git("commit", "-m", "initial");
    await fs.mkdir(path.join(root, "sessions", "auth"), { recursive: true });
    await fs.writeFile(path.join(root, "sessions", "auth", "creds.json"), "fixture session");
    await fs.writeFile(path.join(root, "sessions", "auth", "key.json"), "fixture session key");
    await fs.writeFile(path.join(root, ".env"), "FIXTURE=true");
    await fs.writeFile(path.join(root, "panel-config.json"), "preserve");
    await fs.mkdir(path.join(root, "database"));
    await fs.writeFile(path.join(root, "database", "users.json"), '{"fixtureBalance":1234}');
    const first = await updateCheckout({ root, remote });
    assert.equal(first.initialized, true);
    assert.equal(await fs.readFile(path.join(root, "sessions", "auth", "key.json"), "utf8"), "fixture session key");
    assert.equal(await fs.readFile(path.join(root, ".env"), "utf8"), "FIXTURE=true");
    assert.equal(await fs.readFile(path.join(root, "panel-config.json"), "utf8"), "preserve");
    assert.equal(await fs.readFile(path.join(root, "database", "users.json"), "utf8"), '{"fixtureBalance":1234}');
    assert.equal((await updateCheckout({ root, remote })).sameRev, true);
    // A failed dependency install must be retried even if HEAD is now current.
    const marker = path.join(root, ".git", "kelin-dependencies-pending");
    await fs.writeFile(marker, first.newRev);
    assert.equal((await updateCheckout({ root, remote })).sameRev, true);
    await assert.rejects(fs.access(marker));
    // Repair a stale origin instead of fetching the wrong fork.
    execFileSync("git", ["-C", root, "remote", "set-url", "origin", path.join(temporary, "missing")]);
    await fs.writeFile(path.join(remote, "bot.js"), "version two");
    git("add", ".");
    git("commit", "-m", "next");
    const second = await updateCheckout({ root, remote });
    assert.equal(second.sameRev, false);
    assert.equal(await fs.readFile(path.join(root, "bot.js"), "utf8"), "version two");
    assert.equal(await fs.readFile(path.join(root, "sessions", "auth", "creds.json"), "utf8"), "fixture session");
    await assert.rejects(updateCheckout({ root, remote, branch: "main; bad" }), /Invalid GITHUB_BRANCH/);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});
