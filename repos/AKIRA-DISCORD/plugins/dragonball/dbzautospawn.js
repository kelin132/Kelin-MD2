/**
 * KELIN MD — DBZ Auto-Spawner (plugins/dbz/dbzautospawn.js)
 * Automatically spawns a villain every 15–20 minutes in opted-in groups.
 * Mirrors plugins/pokemon/pokeautospawn.js architecture exactly.
 *
 * Commands registered in this file:
 *   .dbzspawn on   — enable auto-spawn in this group
 *   .dbzspawn off  — disable auto-spawn in this group
 */

import { getEnabledDbzChats, setDbzAutospawn, spawnVillainInChat } from "../../lib/dbz/villainSpawn.mjs";

const SPAWN_MIN_MS = 15 * 60 * 1000; // 15 minutes
const SPAWN_MAX_MS = 20 * 60 * 1000; // 20 minutes
const randMs       = () => SPAWN_MIN_MS + Math.random() * (SPAWN_MAX_MS - SPAWN_MIN_MS);

// ── Single global spawner (guarded against double-start) ──────────────────────
if (!global.__dbzAutoSpawnerRunning) {
  global.__dbzAutoSpawnerRunning = true;

  async function runSpawnCycle() {
    try {
      const { getSocket } = await import("../../lib/bot.mjs");
      const sock = getSocket();
      if (!sock) return;

      const chats = await getEnabledDbzChats();
      for (const chatId of chats) {
        try {
          await spawnVillainInChat(sock, chatId);
        } catch (err) {
          console.error(`[dbzautospawn] Spawn failed for ${chatId}:`, err?.message);
        }
      }
    } catch (err) {
      console.error("[dbzautospawn] Cycle error:", err?.message);
    }
  }

  function scheduleNext() {
    setTimeout(async () => {
      await runSpawnCycle();
      scheduleNext();
    }, randMs());
  }

  scheduleNext();
  console.log("[dbzautospawn] DBZ villain auto-spawner started (15–20 min random interval)");
}

// ── Plugin: .dbzspawn on/off ────────────────────────────────────────────────────
export default {
  name:        "dbzspawn",
  aliases:     ["dbzautospawn"],
  description: "Enable/disable DBZ villain auto-spawn in this group",
  category:    "dbz",
  usage:       ".dbzspawn <on|off>",

  async run({ sock, msg, sender, args }) {
    const jid     = msg.key.remoteJid;
    const isGroup = jid?.endsWith("@g.us");

    if (!isGroup) {
      return sock.sendMessage(jid, {
        text: "❌ DBZ auto-spawn only works in groups!",
      }, { quoted: msg });
    }

    const sub = (args[0] || "").toLowerCase();

    if (sub === "on") {
      await setDbzAutospawn(jid, true);
      return sock.sendMessage(jid, {
        text:
`⚡ *DBZ Villain Auto-Spawn: ON*

👹 Villains will now randomly attack this group every 15–20 minutes!
Use *.dbzfight* when a villain appears to battle them.
Use *.dbzspawn off* to disable.`,
      }, { quoted: msg });
    }

    if (sub === "off") {
      await setDbzAutospawn(jid, false);
      return sock.sendMessage(jid, {
        text: "🔕 *DBZ Villain Auto-Spawn: OFF*\nVillains will no longer appear in this group.",
      }, { quoted: msg });
    }

    return sock.sendMessage(jid, {
      text: "Usage: *.dbzspawn on* / *.dbzspawn off*",
    }, { quoted: msg });
  },
};
