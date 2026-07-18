import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";

const WORKSPACE_ROOT = path.resolve(process.cwd(), "../..");
const SETTINGS_PATH = path.join(WORKSPACE_ROOT, "config", "settings.json");

const DEFAULT_SETTINGS = {
  ownerName: "Kelin",
  ownerNumber: "",
  botName: "KELIN MD",
  prefix: ".",
  themeEmoji: "⚡",
  footer: "© KELIN MD",
  mongoUri: "",
  sessionFolder: "sessions",
  premiumUsers: [] as string[],
  adminNumbers: [] as string[],
  autoRead: false,
  autoReact: false,
  antiLink: false,
  antiSpam: true,
  antiDelete: false,
  welcomeMessage: true,
  xpSystem: true,
};

export type BotSettings = typeof DEFAULT_SETTINGS;

function ensureDir(p: string): void {
  const dir = path.dirname(p);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function getSettings(): BotSettings {
  try {
    if (existsSync(SETTINGS_PATH)) {
      const raw = readFileSync(SETTINGS_PATH, "utf-8");
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {
    // fall through to defaults
  }
  return { ...DEFAULT_SETTINGS };
}

export function updateSettings(updates: Partial<BotSettings>): BotSettings {
  const current = getSettings();
  const merged = { ...current, ...updates };
  ensureDir(SETTINGS_PATH);
  writeFileSync(SETTINGS_PATH, JSON.stringify(merged, null, 2), "utf-8");
  return merged;
}
