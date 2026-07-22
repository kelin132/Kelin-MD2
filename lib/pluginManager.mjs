/**
 * KELIN MD — Plugin manager
 * Hot-loadable ESM plugins from plugins/<category>/<name>.js
 *
 * Plugin export flags:
 *   isOwner      {boolean}  — owner-only
 *   isStaff      {boolean}  — staff (level ≥ 2) or owner
 *   isMod        {boolean}  — mod (level ≥ 1), staff, or owner
 *   isPremium    {boolean}  — premium, mod, staff, or owner
 *   checkJail    {boolean}  — block jailed users from running this command
 */
import { readdirSync, statSync, existsSync } from "fs";
import path from "path";
import { log } from "./logger.mjs";
import { getPermissions } from "./permissions.mjs";

const PLUGINS_DIR = path.resolve("plugins");

let plugins  = [];   // { meta, run, category }
let commands = [];   // flat list of all command names + aliases

// AFK users map — exported so plugins/utilities/afk.js can read/write it
export const afkUsers = new Map(); // sender JID -> { reason, time }

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

  log("info", `Loaded ${plugins.length} plugins from ${categories.length} categories`);
  return { totalPlugins: plugins.length, totalCommands: commands.length };
}

export async function routeMessage(sock, msg, prefix = ".", ownerNumber = "", fromMe = false) {
  const body =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    "";

  if (!body.startsWith(prefix)) return;

  const [rawCmd, ...rawArgs] = body.slice(prefix.length).trim().split(/\s+/);
  const cmd  = rawCmd.toLowerCase();
  const args = rawArgs;
  const text = rawArgs.join(" ");

  // Full JID from participant (groups) or remoteJid (DM)
  const sender = msg.key.participant || msg.key.remoteJid || "";

  // ── Block commands in DMs (non-group chats) ──────────────────────────────
  // Only owner (fromMe or matching ownerNumber) may use commands in DMs.
  const chatId = msg.key.remoteJid;
  const isDM   = !chatId?.endsWith("@g.us");
  if (isDM) {
    const senderNumber = sender.split("@")[0].split(":")[0];
    const isOwnerDM    = fromMe || (ownerNumber && senderNumber === ownerNumber.replace(/\D/g, ""));
    if (!isOwnerDM) return; // silently ignore commands in DMs from non-owners
  }

  // Resolve all permissions in one DB round-trip
  const perms = await getPermissions(sender, ownerNumber, { fromMe, sock, chatId });
  const { isOwner, isStaff, isMod, isPremium, isJailed, staffLevel, staffImmunity } = perms;

  // ── Bare prefix or unknown command ──────────────────────────────────────
  if (!cmd) {
    await sock.sendMessage(
      msg.key.remoteJid,
      {
        text:
          "*NO SUCH COMMAND, BAKA*",
      },
      { quoted: msg }
    );
    return;
  }

  const plugin = plugins.find(
    (p) => p.name === cmd || (p.aliases ?? []).includes(cmd)
  );
  if (!plugin) {
    await sock.sendMessage(
      msg.key.remoteJid,
      {
        text:
          "*NO SUCH COMMAND, BAKA*",
      },
      { quoted: msg }
    );
    return;
  }

  // ── Permission gate ──────────────────────────────────────────────────────
  if (plugin.isOwner && !isOwner && !isMod) {
    await sock.sendMessage(msg.key.remoteJid, { text: "❌ Owner only command." }, { quoted: msg });
    return;
  }
  if (plugin.isStaff && !isStaff && !isOwner) {
    await sock.sendMessage(msg.key.remoteJid, { text: "❌ Staff only command." }, { quoted: msg });
    return;
  }
  if (plugin.isMod && !isMod && !isOwner) {
    await sock.sendMessage(msg.key.remoteJid, { text: "❌ Mod only command." }, { quoted: msg });
    return;
  }
  if (plugin.isPremium && !isPremium && !isOwner) {
    await sock.sendMessage(msg.key.remoteJid, { text: "❌ Premium only command." }, { quoted: msg });
    return;
  }

  // ── Group admin gate (isAdmin: true on a plugin) ──────────────────────────
  if (plugin.isAdmin && !isOwner) {
    if (!chatId?.endsWith("@g.us")) {
      await sock.sendMessage(msg.key.remoteJid, { text: "❌ This command can only be used in groups." }, { quoted: msg });
      return;
    }
    try {
      const meta          = await sock.groupMetadata(chatId);
      const senderDigits  = sender.split("@")[0].split(":")[0];
      const isGroupAdmin  = meta.participants.some(
        (p) => p.admin && p.id.split("@")[0].split(":")[0] === senderDigits
      );
      if (!isGroupAdmin) {
        await sock.sendMessage(msg.key.remoteJid, { text: "❌ Group admins only." }, { quoted: msg });
        return;
      }
    } catch {
      // If metadata fetch fails allow the command to proceed (bot may not be admin yet)
    }
  }

  if (plugin.checkJail && isJailed && !staffImmunity) {
    await sock.sendMessage(
      msg.key.remoteJid,
      { text: "🔒 You are in *jail*! You cannot use economy commands right now.\n\nWait for your sentence to end or ask a staff member to unjail you." },
      { quoted: msg }
    );
    return;
  }

  try {
    await plugin.run({
      sock, msg, args, text, cmd, sender, prefix,
      isOwner, isStaff, isMod, isPremium, isJailed, staffLevel, staffImmunity,
    });
  } catch (err) {
    log("error", `Plugin ${plugin.name} error: ${err.message}`);
    await sock.sendMessage(msg.key.remoteJid, {
      text: `❌ Command failed: ${err.message}`,
    }, { quoted: msg });
  }
}

export function getPlugins()  { return plugins; }
export function getCommands() { return commands; }
