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
import { ensureDb } from "./mongo.mjs";
import { syncWebsiteProfilePicture } from "./websiteAuth.mjs";

const PLUGINS_DIR = path.resolve("plugins");

let plugins  = [];   // { meta, run, category }
let commands = [];   // flat list of all command names + aliases

const profilePictureSyncInFlight = new Set();

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

  const chatId = msg.key.remoteJid;
  const isDM   = !chatId?.endsWith("@g.us");

  // The normal index.js boot path awaits connectDb(), but command routing can also
  // be reached by panel/hot-reload launchers. Ensure the shared DB is ready here
  // before permissions or any database-backed plugin code runs.
  await ensureDb();

  // Resolve all permissions in one DB round-trip
  const perms = await getPermissions(sender, ownerNumber, { fromMe, sock, chatId });
  const { isOwner, isStaff, isMod, isPremium, isJailed, isBanned, staffLevel, staffImmunity } = perms;

  // Profile syncing is unrelated to command authorization. In particular, do
  // not make the owner wait for their own avatar lookup on every command.
  if (!isOwner && sender && !sender.endsWith("@g.us")) {
    if (!profilePictureSyncInFlight.has(sender)) {
      profilePictureSyncInFlight.add(sender);
      void (async () => {
        try {
          const profilePictureUrl = await sock.profilePictureUrl(sender, "image").catch(() => null);
          if (profilePictureUrl) await syncWebsiteProfilePicture(sender, profilePictureUrl);
        } catch {
          // Profile-picture access is optional; command routing must continue.
        } finally {
          profilePictureSyncInFlight.delete(sender);
        }
      })();
    }
  }

  // Keep DMs owner-only for administrative commands. The website ID lookup
  // remains available privately; OTP reset codes are group-only.
  if (isDM && !isOwner && cmd !== "id") return;

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

  // Staff-category commands are never available to regular users, even if a
  // plugin was added without its own isStaff/isMod metadata.
  if (plugin.category === "staff" && !isMod && !isStaff && !isOwner) {
    await sock.sendMessage(
      msg.key.remoteJid,
      { text: "*NO SUCH COMMAND, BAKA*" },
      { quoted: msg }
    );
    return;
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
