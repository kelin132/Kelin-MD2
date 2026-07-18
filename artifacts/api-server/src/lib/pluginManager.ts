import path from "path";
import { readdirSync, statSync, existsSync } from "fs";
import { logger } from "./logger";
import { botLog } from "./logBuffer";
import type { WASocket, WAMessage } from "@whiskeysockets/baileys";

const WORKSPACE_ROOT = path.resolve(process.cwd(), "../..");
const PLUGINS_DIR = process.env["PLUGINS_DIR"] ?? path.join(WORKSPACE_ROOT, "plugins");

export type PluginCategory =
  | "main"
  | "group"
  | "admin"
  | "owner"
  | "download"
  | "ai"
  | "anime"
  | "fun"
  | "games"
  | "media"
  | "search"
  | "utilities";

export interface PluginMeta {
  id: string;
  name: string;
  category: PluginCategory;
  enabled: boolean;
  commandCount: number;
  description: string;
  version: string;
}

export interface CommandDef {
  name: string;
  description: string;
  category: string;
  usage: string;
  aliases: string[];
  cooldown: number;
  isOwner: boolean;
  isAdmin: boolean;
  isPremium: boolean;
  pluginId: string;
  run: (ctx: CommandContext) => Promise<void>;
}

export interface CommandContext {
  sock: WASocket;
  msg: WAMessage;
  args: string[];
  text: string;
  sender: string;
  isGroup: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  prefix: string;
}

const plugins = new Map<string, PluginMeta>();
const commands = new Map<string, CommandDef>();
const disabledPlugins = new Set<string>();

export async function loadPlugins(): Promise<void> {
  if (!existsSync(PLUGINS_DIR)) {
    botLog("warn", `Plugins directory not found: ${PLUGINS_DIR}`);
    return;
  }

  plugins.clear();
  commands.clear();

  const categories = readdirSync(PLUGINS_DIR).filter((d) => {
    const full = path.join(PLUGINS_DIR, d);
    return statSync(full).isDirectory();
  });

  for (const category of categories) {
    const catDir = path.join(PLUGINS_DIR, category);
    const files = readdirSync(catDir).filter((f) => f.endsWith(".js") || f.endsWith(".mjs"));

    for (const file of files) {
      const pluginId = `${category}/${file.replace(/\.(m?js)$/, "")}`;
      const filePath = path.join(catDir, file);

      try {
        // Cache-busting import for hot reload
        const mod = await import(`${filePath}?v=${Date.now()}`);
        const plugin = mod.default ?? mod;

        if (!plugin || !plugin.name) {
          logger.warn({ filePath }, "Invalid plugin (no name)");
          continue;
        }

        const pluginCommands: CommandDef[] = Array.isArray(plugin.commands)
          ? plugin.commands
          : [plugin];

        const enabled = !disabledPlugins.has(pluginId);
        const meta: PluginMeta = {
          id: pluginId,
          name: plugin.name,
          category: (plugin.category ?? category) as PluginCategory,
          enabled,
          commandCount: pluginCommands.length,
          description: plugin.description ?? "",
          version: plugin.version ?? "1.0.0",
        };

        plugins.set(pluginId, meta);

        if (enabled) {
          for (const cmd of pluginCommands) {
            commands.set(cmd.name, { ...cmd, pluginId });
            for (const alias of cmd.aliases ?? []) {
              commands.set(alias, { ...cmd, name: alias, pluginId });
            }
          }
        }

        botLog("debug", `Loaded plugin: ${pluginId}`);
      } catch (err) {
        botLog("error", `Failed to load plugin: ${pluginId}`, String(err));
        logger.error({ err, pluginId }, "Plugin load error");
      }
    }
  }

  botLog("info", `Loaded ${plugins.size} plugins, ${commands.size} commands`);
  logger.info({ plugins: plugins.size, commands: commands.size }, "Plugins loaded");
}

export async function reloadPlugins(): Promise<void> {
  botLog("info", "Reloading all plugins...");
  await loadPlugins();
}

export function togglePlugin(id: string, enabled: boolean): PluginMeta | null {
  const plugin = plugins.get(id);
  if (!plugin) return null;

  plugin.enabled = enabled;
  if (enabled) {
    disabledPlugins.delete(id);
  } else {
    disabledPlugins.add(id);
  }
  plugins.set(id, plugin);
  return plugin;
}

export function getPlugins(): PluginMeta[] {
  return Array.from(plugins.values());
}

export function getCommands(): CommandDef[] {
  const seen = new Set<string>();
  return Array.from(commands.values()).filter((c) => {
    if (seen.has(c.pluginId + c.name)) return false;
    seen.add(c.pluginId + c.name);
    return true;
  });
}

export async function routeMessage(sock: WASocket, msg: WAMessage): Promise<void> {
  const body =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    "";

  const { getSettings } = await import("./settingsManager.js");
  const settings = getSettings();
  const prefix = settings.prefix ?? ".";

  if (!body.startsWith(prefix)) return;

  const [rawCmd, ...args] = body.slice(prefix.length).trim().split(/\s+/);
  const cmdName = rawCmd?.toLowerCase();
  if (!cmdName) return;

  const cmd = commands.get(cmdName);
  if (!cmd) return;

  const sender = msg.key.remoteJid ?? "";
  const isGroup = sender.endsWith("@g.us");
  const isOwner = settings.ownerNumber
    ? sender.includes(settings.ownerNumber)
    : false;

  const ctx: CommandContext = {
    sock,
    msg,
    args,
    text: args.join(" "),
    sender,
    isGroup,
    isOwner,
    isAdmin: false, // TODO: check group admins
    prefix,
  };

  if (cmd.isOwner && !isOwner) {
    await sock.sendMessage(sender, { text: "This command is owner-only." });
    return;
  }

  try {
    await cmd.run(ctx);
    botLog("info", `Command executed: ${cmdName} by ${sender}`);
  } catch (err) {
    botLog("error", `Command error: ${cmdName}`, String(err));
    await sock.sendMessage(sender, {
      text: `Error executing command: ${String(err)}`,
    });
  }
}
