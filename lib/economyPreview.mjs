import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const WEBSITE_ORIGIN = "https://aidoru.zone.id";
const ASSET_DIR = fileURLToPath(new URL("../assets/", import.meta.url));

const PREVIEW_CONFIG = {
  arcade: {
    url: `${WEBSITE_ORIGIN}/arcade`,
    title: "🎰 AIDORU Arcade",
    description: "Play, bet, spin, and grow your trainer fortune in the AIDORU arcade.",
    image: "economy-preview-arcade.jpg",
  },
  money: {
    url: `${WEBSITE_ORIGIN}/arcade`,
    title: "💰 AIDORU Money Hub",
    description: "Manage your wallet, bank, deposits, withdrawals, and economy progress.",
    image: "economy-preview-dep.jpg",
  },
  pokemon: {
    url: `${WEBSITE_ORIGIN}/battle`,
    title: "⚔️ AIDORU Pokémon Battles",
    description: "Prepare your Pokémon party and enter the AIDORU battle arena.",
    image: "economy-preview-pokemon.jpg",
  },
  mart: {
    url: `${WEBSITE_ORIGIN}/mart`,
    title: "🏪 AIDORU Pokémon Mart",
    description: "Browse Pokémon items, Poké Balls, upgrades, and trainer supplies on AIDORU.",
    image: "economy-preview-mart.jpg",
  },
  profile: {
    url: `${WEBSITE_ORIGIN}/profile`,
    title: "🌸 AIDORU Trainer Profile",
    description: "View your trainer profile, level, XP, party, and community identity.",
    image: "economy-preview-profile.jpg",
  },
  cards: {
    url: `${WEBSITE_ORIGIN}/cards`,
    title: "🎴 AIDORU Card Collection",
    description: "View your anime cards, collection progress, and card leaderboards.",
    image: "economy-preview-cards.jpg",
  },
  community: {
    url: `${WEBSITE_ORIGIN}/dashboard`,
    title: "✨ AIDORU Community Dashboard",
    description: "Track your account, progress, pets, cards, and community adventures.",
    image: "economy-preview-profile.jpg",
  },
};

const COMMAND_KIND = new Map([
  ["deposit", "money"], ["withdraw", "money"], ["balance", "money"], ["ebal", "money"],
  ["pay", "money"], ["donate", "money"], ["convert", "money"], ["loan", "money"],
  ["vault", "money"], ["history", "money"], ["diamonds", "money"], ["orbs", "money"],
  ["beg", "arcade"], ["work", "arcade"], ["crime", "arcade"], ["rob", "arcade"],
  ["heist", "arcade"], ["invest", "arcade"], ["pool", "arcade"], ["lottery", "arcade"],
  ["daily", "arcade"], ["weekly", "arcade"], ["monthly", "arcade"], ["gamble", "arcade"],
  ["bet", "arcade"], ["blackjack", "arcade"], ["coinflip", "arcade"], ["roulette", "arcade"],
  ["slots", "arcade"], ["richg", "arcade"],
  ["challenge", "pokemon"],
  ["mart", "mart"], ["shop", "mart"],
  ["profile", "profile"], ["register", "profile"], ["rename", "profile"],
  ["setage", "profile"], ["bio", "profile"], ["edit", "profile"],
  ["inventory", "community"], ["use", "community"], ["sell", "community"],
  ["get", "community"], ["mycds", "community"], ["lb", "cards"],
  ["clb", "cards"], ["slb", "cards"], ["cardleaderboard", "cards"],
]);

const thumbnailPromises = new Map();

function getThumbnail(fileName) {
  if (!thumbnailPromises.has(fileName)) {
    thumbnailPromises.set(fileName, readFile(`${ASSET_DIR}${fileName}`).catch(() => null));
  }
  return thumbnailPromises.get(fileName);
}

export function getEconomyPreviewConfig(commandName) {
  const kind = COMMAND_KIND.get(String(commandName || "").toLowerCase());
  return kind ? PREVIEW_CONFIG[kind] : null;
}

export async function buildEconomyLinkPreview(commandName) {
  const config = getEconomyPreviewConfig(commandName);
  if (!config) return null;
  return {
    "canonical-url": config.url,
    "matched-text": config.url,
    title: config.title,
    description: config.description,
    jpegThumbnail: await getThumbnail(config.image),
  };
}

export function hasEconomyPreview(commandName) {
  return Boolean(getEconomyPreviewConfig(commandName));
}

export function withHiddenPreviewUrl(text, commandName) {
  const config = getEconomyPreviewConfig(commandName);
  if (!config || typeof text !== "string" || text.includes(config.url)) return text;
  return `${text.trim()}\n\n||${config.url}||`;
}
