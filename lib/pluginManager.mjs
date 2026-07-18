/**
 * KELIN MD — Plugin manager (standalone)
 * Hot-loadable ESM plugins from plugins/<category>/<name>.js
 */
import { readdirSync, statSync, existsSync } from "fs";
import path from "path";
import { log } from "./logger.mjs";

const PLUGINS_DIR = path.resolve("plugins");

let plugins = [];   // { meta, run, category }
let commands = [];  // flat list of all command names + aliases

export async function loadPlugins(prefix = ".") {
  plugins = [];
  commands = [];

  if (!existsSync(PLUGINS_DIR)) {
    log("warn", "No plugins/ directory found.");
    return { totalPlugins: 0, totalCommands: 0 };
  }

  const categories = readdirSync(PLUGINS_DIR).filter((f) => {
    return statSync(path.join(PLUGINS_DIR, f)).isDirectory();
  });

  for (const cat of categories) {
    const catDir = path.join(PLUGINS_DIR, cat);
    const files  = readdirSync(catDir).filter((f) => f.endsWith(".js"));

    for (const file of files) {
      const filePath = path.join(catDir, file);
      try {
        const mod = await import(`${filePath}?v=${Date.now()}`);
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

export async function routeMessage(sock, msg, prefix = ".", ownerNumber = "") {
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

  const sender = msg.key.participant || msg.key.remoteJid || "";
  const senderNum = sender.replace(/[^0-9]/g, "");
  const isOwner = !!ownerNumber && senderNum.includes(ownerNumber.replace(/\D/g, ""));

  const plugin = plugins.find(
    (p) => p.name === cmd || (p.aliases ?? []).includes(cmd)
  );

  if (!plugin) return;

  // Permission checks
  if (plugin.isOwner && !isOwner) {
    await sock.sendMessage(msg.key.remoteJid, { text: "❌ Owner only command." });
    return;
  }

  try {
    await plugin.run({ sock, msg, args, text, sender, prefix, isOwner });
  } catch (err) {
    log("error", `Plugin ${plugin.name} error: ${err.message}`);
    await sock.sendMessage(msg.key.remoteJid, {
      text: `❌ Command failed: ${err.message}`,
    });
  }
}

export function getPlugins()  { return plugins; }
export function getCommands() { return commands; }
