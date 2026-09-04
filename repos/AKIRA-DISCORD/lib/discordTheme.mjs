export const AIDORU_COLORS = Object.freeze({
  default: "#A970FF",
  success: "#45D483",
  info: "#31C8FF",
  warning: "#FFD166",
  danger: "#FF5D73",
  idol: "#FF4FA3",
  mint: "#5EEAD4",
});

export const AIDORU_FOOTER = Object.freeze({
  text: "✦ AIDORU • AKIRA",
});

const CATEGORY_COLORS = Object.freeze({
  ai: AIDORU_COLORS.idol,
  anime: AIDORU_COLORS.idol,
  cards: "#FF8A65",
  economy: AIDORU_COLORS.warning,
  games: "#9B8CFF",
  guild: AIDORU_COLORS.info,
  image: AIDORU_COLORS.idol,
  main: AIDORU_COLORS.default,
  owner: "#BFA2FF",
  pets: AIDORU_COLORS.mint,
  pokemon: AIDORU_COLORS.info,
  search: "#7DD3FC",
  staff: AIDORU_COLORS.danger,
  utilities: "#C4B5FD",
});

function normalizeColor(value) {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : null;
}

export function discordAccentColor(plugin = {}) {
  return (
    normalizeColor(plugin.discordColor)
    || CATEGORY_COLORS[String(plugin.category || "").toLowerCase()]
    || AIDORU_COLORS.default
  );
}

export function discordStateColor(text, fallback = AIDORU_COLORS.default) {
  const value = String(text || "");
  if (/(?:cooldown|wait|failed|error|denied|cannot|not enough|❌|🚫)/i.test(value)) {
    return AIDORU_COLORS.danger;
  }
  if (/(?:success|successful|complete|completed|✅|🎉)/i.test(value)) {
    return AIDORU_COLORS.success;
  }
  if (/(?:warning|careful|already|⚠️)/i.test(value)) {
    return AIDORU_COLORS.warning;
  }
  return normalizeColor(fallback) || AIDORU_COLORS.default;
}

export function discordCommandTitle(command) {
  const label = String(command || "response")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
  return label ? `✦ AIDORU · ${label}` : "✦ AIDORU";
}

export function normalizeDiscordFooter(footer) {
  if (footer === false) return null;
  const source = footer === undefined ? AIDORU_FOOTER : footer;
  const value = typeof source === "object" ? source : { text: source };
  const text = String(value?.text || "").trim();
  if (!text) return null;
  return {
    text,
    ...(value.iconURL ? { iconURL: String(value.iconURL) } : {}),
  };
}