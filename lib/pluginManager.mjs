/**
 * KELIN MD — Plugin manager (standalone)
 * Hot-loadable ESM plugins from plugins/<category>/<name>.js
 */
import { readdirSync, statSync, existsSync } from "fs";
import path from "path";
import { log } from "./logger.mjs";
import { readData } from "./store.mjs";

const PLUGINS_DIR = path.resolve("plugins");

let plugins  = [];  // { meta, run, category }
let commands = [];  // flat list of all command names + aliases

// ── AFK tracking ─────────────────────────────────────────────────────────────
export const afkUsers = new Map(); // jid -> { reason, time }

// ── Bot mode ──────────────────────────────────────────────────────────────────
let _botMode = "public"; // "public" | "private"
export function getBotMode()      { return _botMode; }
export function setBotMode(mode)  { _botMode = mode; }

// ── Plugin loader ─────────────────────────────────────────────────────────────
export async function loadPlugins(prefix = ".") {
  plugins  = [];
  commands = [];

  if (!existsSync(PLUGINS_DIR)) {
    log("warn", "No plugins/ directory found.");
    return { totalPlugins: 0, totalCommands: 0 };
  }

  const categories = readdirSync(PLUGINS_DIR).filter((f) =>
    statSync(path.join(PLUGINS_DIR, f)).isDirectory()
  );

  for (const cat of categories) {
    const catDir = path.join(PLUGINS_DIR, cat);
    const files  = readdirSync(catDir).filter((f) => f.endsWith(".js"));

    for (const file of files) {
      const filePath = path.join(catDir, file);
      try {
        const mod    = await import(`${filePath}?v=${Date.now()}`);
        const plugin = mod.default;
        if (!plugin?.name || typeof plugin.run !== "function") continue;
        plugins.push({ ...plugin, category: cat });
        commands.push(plugin.name, ...(plugin.aliases ?? []));
      } catch (err) {
        log("warn", `Failed to load plugin ${cat}/${file}: ${err.message}`);
      }
    }
  }

  // Load saved bot mode
  const settings = readData("settings", { botMode: "public" });
  _botMode = settings.botMode ?? "public";

  log("info", `Loaded ${plugins.length} plugins from ${categories.length} categories`);
  return { totalPlugins: plugins.length, totalCommands: commands.length };
}

// ── Owner number check ────────────────────────────────────────────────────────
function checkIsOwner(senderJid, ownerNumber) {
  if (!ownerNumber) return false;
  const senderNum = senderJid.replace(/[^0-9]/g, "");
  // Support comma-separated list of owner numbers
  const owners = ownerNumber.split(",").map((n) => n.replace(/\D/g, "").trim()).filter(Boolean);
  return owners.some((on) =>
    senderNum === on ||
    senderNum.endsWith(on) ||
    on.endsWith(senderNum)
  );
}

// ── Mod check ─────────────────────────────────────────────────────────────────
function checkIsMod(senderJid) {
  const mods = readData("mods", { list: [] }).list ?? [];
  const senderNum = senderJid.replace(/[^0-9]/g, "");
  return mods.some((m) => {
    const mn = m.replace(/[^0-9]/g, "");
    return senderNum === mn || senderNum.endsWith(mn) || mn.endsWith(senderNum);
  });
}

// ── Group admin check ─────────────────────────────────────────────────────────
async function checkIsGroupAdmin(sock, jid, sender) {
  try {
    const meta    = await sock.groupMetadata(jid);
    const admins  = meta.participants.filter((p) => p.admin).map((p) => p.id);
    return admins.some((a) => a.includes(sender.replace(/[^0-9]/g, "")));
  } catch {
    return false;
  }
}

// ── Message router ────────────────────────────────────────────────────────────
export async function routeMessage(sock, msg, prefix = ".", ownerNumber = "") {
  const body =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    "";

  const jid       = msg.key.remoteJid;
  const isGroup   = jid?.endsWith("@g.us") ?? false;
  const sender    = msg.key.participant || msg.key.remoteJid || "";
  const senderNum = sender.replace(/[^0-9]/g, "");
  const isOwner   = checkIsOwner(sender, ownerNumber);
  const isMod     = !isOwner && checkIsMod(sender);

  // ── AFK: sender had AFK set — remove it ──────────────────────────────────
  if (afkUsers.has(sender) && body && !body.startsWith(prefix + "afk")) {
    const { reason } = afkUsers.get(sender);
    afkUsers.delete(sender);
    await sock.sendMessage(jid, {
      text: `👋 Welcome back! Your AFK status has been removed.\n_(Was: ${reason || "AFK"})_`,
    }, { quoted: msg });
  }

  // ── AFK: message mentions an AFK user ────────────────────────────────────
  if (isGroup && body) {
    for (const [afkJid, afkData] of afkUsers) {
      const afkNum = afkJid.replace(/[^0-9]/g, "");
      if (body.includes(afkNum) || body.includes(`@${afkNum}`)) {
        const since = Math.floor((Date.now() - afkData.time) / 60_000);
        await sock.sendMessage(jid, {
          text: `⚠️ @${afkNum} is AFK${afkData.reason ? ` (${afkData.reason})` : ""} — ${since}m ago`,
          mentions: [afkJid],
        });
      }
    }
  }

  if (!body.startsWith(prefix)) return;

  const [rawCmd, ...rawArgs] = body.slice(prefix.length).trim().split(/\s+/);
  const cmd  = rawCmd.toLowerCase();
  const args = rawArgs;
  const text = rawArgs.join(" ");

  const plugin = plugins.find(
    (p) => p.name === cmd || (p.aliases ?? []).includes(cmd)
  );

  if (!plugin) return;

  // ── Private mode: non-owner/mod blocked ──────────────────────────────────
  if (_botMode === "private" && !isOwner && !isMod) {
    await sock.sendMessage(jid, { text: "🔒 Bot is in private mode. Only mods and owner can use commands." });
    return;
  }

  // ── Permission: owner-only ────────────────────────────────────────────────
  if (plugin.isOwner && !isOwner) {
    await sock.sendMessage(jid, { text: "❌ This command is for the bot owner only." });
    return;
  }

  // ── Permission: group admin ───────────────────────────────────────────────
  if (plugin.isAdmin && isGroup) {
    const isAdmin = await checkIsGroupAdmin(sock, jid, sender);
    if (!isAdmin && !isOwner && !isMod) {
      await sock.sendMessage(jid, { text: "❌ This command requires group admin permissions." });
      return;
    }
  }

  try {
    await plugin.run({
      sock,
      msg,
      args,
      text,
      cmd,
      sender,
      senderNum,
      prefix,
      isOwner,
      isMod,
      isGroup,
      allPlugins: plugins,
    });
  } catch (err) {
    log("error", `Plugin ${plugin.name} error: ${err.message}`);
    await sock.sendMessage(jid, { text: `❌ Command failed: ${err.message}` });
  }
}

export function getPlugins()  { return plugins; }
export function getCommands() { return commands; }
