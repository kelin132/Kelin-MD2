import test from "node:test";
import assert from "node:assert/strict";
import {
  applyGroupSettingsSnapshot,
  applyGroupSettingsUpdate,
  getGroupSettingsSnapshot,
  groupSettings,
  initGroupSettings,
} from "../lib/groupSettings.js";

test("workers can hydrate group settings from a supervisor snapshot without MongoDB", async () => {
  const snapshot = {
    "111@g.us": {
      welcome: "Welcome!",
      welcomeEnabled: true,
      activityCounts: { "222@s.whatsapp.net": 9 },
      activityLastSeen: { "222@s.whatsapp.net": 123 },
    },
  };

  assert.equal(await initGroupSettings(snapshot), true);
  assert.deepEqual(groupSettings.get("111@g.us"), {
    welcome: "Welcome!",
    welcomeEnabled: true,
  });
  assert.deepEqual(getGroupSettingsSnapshot(), {
    "111@g.us": {
      welcome: "Welcome!",
      welcomeEnabled: true,
    },
  });
});

test("group setting changes update snapshots and can be broadcast to workers", () => {
  applyGroupSettingsSnapshot({ "111@g.us": { welcome: "Old" } });
  assert.equal(applyGroupSettingsUpdate({
    type: "groupSettings:update",
    action: "set",
    jid: "111@g.us",
    settings: { welcome: "New", antilink: true },
  }), true);
  assert.deepEqual(groupSettings.get("111@g.us"), {
    welcome: "New",
    antilink: true,
  });

  assert.equal(applyGroupSettingsUpdate({
    type: "groupSettings:update",
    action: "delete",
    jid: "111@g.us",
  }), true);
  assert.deepEqual(getGroupSettingsSnapshot(), {});
  applyGroupSettingsSnapshot({});
});
