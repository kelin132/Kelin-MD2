// Commands in this list still depend on WhatsApp-only message formats, JIDs,
// or background events. Discord-native implementations are kept in their
// original plugin names and are not listed here.
export const DISCORD_UNSUPPORTED_COMMANDS = new Set([
  "add",
  "antibadword",
  "antimention",
  "antispam",
  "dbzchallenge",
  "dbzreset",
  "dbzspawn",
  "gstatus",
  "leave",
  "sticker",
  "otp",
  "reqbot",
  "setpokes",
  "shazam-whatsapp-only",
  "support",
  "vv",
  "warn",
]);

export function isDiscordSupported(plugin) {
  return plugin?.discord !== false &&
    !DISCORD_UNSUPPORTED_COMMANDS.has(String(plugin?.name || "").toLowerCase());
}