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
import { groupSettings } from "./groupSettings.js";
import { games as ticTacToeGames } from "./tictactoe.js";
import { jidNumber } from "./whatsappIdentity.mjs";

const PLUGINS_DIR = path.resolve("plugins");

let plugins  = [];   // { meta, run, category }
let commands = [];   // flat list of all command names + aliases

// Per-sender command cooldowns. Plugins can still enforce longer,
// command-specific cooldowns inside their own handlers.
const commandCooldowns = new Map();

// AFK users map — exported so plugins/utilities/afk.js can read/write it
export const afkUsers = new Map(); // sender JID -> { reason, time }

function afkKey(jid) {
  return String(jid || "").split("@")[0].split(":")[0];
}

export function getAfkUser(jid) {
  return afkUsers.get(jid) || afkUsers.get(afkKey(jid));
}

export function setAfkUser(jid, data) {
  const value = { ...data, jid };
  afkUsers.set(jid, value);
  afkUsers.set(afkKey(jid), value);
}

export function deleteAfkUser(jid) {
  const value = getAfkUser(jid);
  afkUsers.delete(jid);
  afkUsers.delete(afkKey(jid));
  if (value?.jid) afkUsers.delete(value.jid);
}

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

export async function routeMessage(
  sock,
  msg,
  prefix = ".",
  ownerNumber = "",
  fromMe = false,
  identity = null,
) {
  const body =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    "";

  const chatId = msg.key.remoteJid;
  const isDirectTicTacToeMove =
    chatId?.endsWith("@g.us") &&
    ticTacToeGames.has(chatId) &&
    /^[1-9]$/.test(body.trim());

  if (!body.startsWith(prefix) && !isDirectTicTacToeMove) return;

  const commandText = isDirectTicTacToeMove ? `m ${body.trim()}` : body.slice(prefix.length).trim();
  const [rawCmd, ...rawArgs] = commandText.split(/\s+/);
  const cmd  = rawCmd.toLowerCase();
  const args = rawArgs;
  const text = rawArgs.join(" ");

  // Full JID from participant (groups) or remoteJid (DM)
  const sender = identity?.jid || msg.key.participant || msg.key.remoteJid || "";
  const phoneNumber =
    identity?.phoneNumber ||
    (sender.endsWith("@lid") ? "" : jidNumber(sender));
  const formattedNumber = identity?.formattedNumber || (phoneNumber ? `+${phoneNumber}` : "");

  const isDM   = !chatId?.endsWith("@g.us");

  // Resolve all permissions in one DB round-trip
  const perms = await getPermissions(sender, ownerNumber, { fromMe, sock, chatId });
  const { isOwner, isStaff, isMod, isPremium, isJailed, isBanned, staffLevel, staffImmunity } = perms;

  // Keep DMs owner-only for administrative commands. Linking is intentionally
  // available in a user's private chat because that is where the website's
  // account-link flow tells users to run it.
  if (isDM && !isOwner && cmd !== "linkweb") return;

  // ── Block banned users from every command ────────────────────────────────
  if (isBanned && !isOwner) {
    await sock.sendMessage(
      msg.key.remoteJid,
      { text: "🚫 You are *banned* from using this bot.\nContact the owner to appeal." },
      { quoted: msg }
    );
    return;
  }

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

  // ── Bot disabled in this group ───────────────────────────────────────────
  // Owners and mods can still use the .bot command to re-enable.
  if (chatId?.endsWith("@g.us")) {
    const gs = groupSettings.get(chatId);
    if (gs.botEnabled === false) {
      const isBotCmd = cmd === "bot" || cmd === "boton" || cmd === "botoff";
      if (!isBotCmd || (!isMod && !isOwner)) return; // silently ignore
    }
  }

  // ── Category disabled in this group ─────────────────────────────────────
  // Staff, mods, and owners bypass category restrictions.
  if (chatId?.endsWith("@g.us") && !isMod && !isStaff && !isOwner) {
    const gs = groupSettings.get(chatId);
    const disabledCats = gs.disabledCategories || [];
    const pluginCat = plugin.category || "";
    if (disabledCats.includes(pluginCat)) {
      await sock.sendMessage(
        chatId,
        { text: `🔒 The *${pluginCat}* category is currently *disabled* in this group.\nAsk a staff member to enable it with \`.enablecat ${pluginCat}\`` },
        { quoted: msg }
      );
      return;
    }
  }

  // ── Hidden commands: invisible to non-authorized users ───────────────────
  if (plugin.hidden && !isMod && !isStaff && !isOwner) {
    await sock.sendMessage(
      msg.key.remoteJid,
      { text: "*NO SUCH COMMAND, BAKA*" },
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
      const senderDigits  = jidNumber(sender);
      const isGroupAdmin  = meta.participants.some(
        (p) => p.admin && jidNumber(p.id) === senderDigits
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

  // Enforce the cooldown declared by each plugin. Economy commands use a
  // six-second default, while commands with longer metadata keep their own
  // configured value.
  const cooldownSeconds = Number(plugin.cooldown);
  if (Number.isFinite(cooldownSeconds) && cooldownSeconds > 0) {
    const cooldownMs = cooldownSeconds * 1000;
    const cooldownKey = `${sender}:${plugin.name}`;
    const lastUsed = commandCooldowns.get(cooldownKey) || 0;
    const remainingMs = cooldownMs - (Date.now() - lastUsed);

    if (remainingMs > 0) {
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      await sock.sendMessage(msg.key.remoteJid, {
        text: `⏳ Please wait *${remainingSeconds}s* before using *.${plugin.name}* again.`,
      }, { quoted: msg });
      return;
    }

    commandCooldowns.set(cooldownKey, Date.now());
  }

  try {
    await plugin.run({
      sock, msg, args, text, cmd, sender, prefix,
      phoneNumber, formattedNumber, identity,
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
