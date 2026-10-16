import test from "node:test";
import assert from "node:assert/strict";
import { isTransientGitProcessError } from "../lib/updater.js";

test("recognizes transient Git process exhaustion for bounded retries", () => {
  assert.equal(
    isTransientGitProcessError(
      new Error("error: cannot fork() for git-remote-https: Resource temporarily unavailable"),
    ),
    true,
  );
  assert.equal(isTransientGitProcessError(Object.assign(new Error("spawn git EAGAIN"), { code: "EAGAIN" })), true);
  assert.equal(isTransientGitProcessError(new Error("fatal: couldn't find remote ref")), false);
});
