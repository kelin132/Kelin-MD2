import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getUpdateBranch, updateViaGit } from "../lib/updater.js";

function git(repoPath, ...args) {
  return execFileSync("git", ["-C", repoPath, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

test("update branch accepts configured refs and rejects shell-like values", () => {
  assert.equal(getUpdateBranch("main"), "main");
  assert.equal(getUpdateBranch("origin/main"), "main");
  assert.equal(getUpdateBranch("refs/heads/release/stable"), "release/stable");
  assert.throws(() => getUpdateBranch("main; touch /tmp/pwned"), /Invalid GITHUB_BRANCH/);
});

test("updater repairs origin and fetches the configured branch once", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "kelin updater test "));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const remote = join(root, "remote.git");
  const seed = join(root, "seed repo");
  const checkout = join(root, "server checkout");
  mkdirSync(seed);

  execFileSync("git", ["init", "--bare", "--initial-branch=main", remote], {
    stdio: "ignore",
  });
  git(seed, "init", "--initial-branch=main");
  git(seed, "config", "user.name", "Updater Test");
  git(seed, "config", "user.email", "updater-test@example.invalid");
  writeFileSync(join(seed, "version.txt"), "one\n");
  git(seed, "add", "version.txt");
  git(seed, "commit", "-m", "initial");
  git(seed, "remote", "add", "origin", remote);
  git(seed, "push", "-u", "origin", "main");
  execFileSync("git", ["clone", remote, checkout], { stdio: "ignore" });

  writeFileSync(join(seed, "version.txt"), "two\n");
  git(seed, "add", "version.txt");
  git(seed, "commit", "-m", "update");
  git(seed, "push", "origin", "main");

  // A host may retain a stale origin; the updater should repair it before fetch.
  git(checkout, "remote", "set-url", "origin", "https://example.invalid/stale.git");
  const result = await updateViaGit({ repoRoot: checkout, remoteUrl: remote, branch: "main" });

  assert.equal(result.sameRev, false);
  assert.equal(readFileSync(join(checkout, "version.txt"), "utf8"), "two\n");
  assert.equal(git(checkout, "remote", "get-url", "origin"), remote);
});
