import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const WEBSITE_ORIGIN = "https://aidoru.zone.id";
const ASSET_DIRS = [
  fileURLToPath(new URL("../assets/", import.meta.url)),
  fileURLToPath(new URL("../../Kelin-MD2/assets/", import.meta.url)),
];
const REMOTE_ASSET_ORIGIN = "https://raw.githubusercontent.com/kelin132/Kelin-MD2/main/assets";

const PREVIEW_CONFIG = {
  arcade: {
    url: `${WEBSITE_ORIGIN}/arcade`,
    title: "🎰 AIDORU Arcade",
    description: "Play, bet, spin, and grow your trainer fortune in the AIDORU arcade.",
    image: "economy-preview-arcade.jpg",
  },
  daily: {
    url: `${WEBSITE_ORIGIN}/journey`,
    title: "🎁 AIDORU Daily Rewards",
    description: "Claim your daily coins, build your streak, and manage your trainer journey.",
    image: "aidoru-web-preview.jpg",
  },
  weekly: {
    url: `${WEBSITE_ORIGIN}/arcade`,
    title: "🗓️ AIDORU Weekly Rewards",
    description: "Keep your AIDORU trainer progress growing with weekly rewards and arcade games.",
    image: "economy-preview-arcade.jpg",
  },
  monthly: {
    url: `${WEBSITE_ORIGIN}/arcade`,
    title: "📅 AIDORU Monthly Rewards",
    description: "Return each month for your reward and keep building your AIDORU fortune.",
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
  ["daily", "daily"], ["weekly", "weekly"], ["monthly", "monthly"], ["gamble", "arcade"],
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


const COMMAND_COPY = new Map([
  ["balance", ["AIDORU Account", "Balance"]],
  ["daily", ["🎁 AIDORU Daily Rewards", "Claim your daily coins and keep your streak alive."]],
  ["weekly", ["🗓️ AIDORU Weekly Rewards", "Keep your trainer progress growing with weekly rewards."]],
  ["monthly", ["📅 AIDORU Monthly Rewards", "Return each month for your AIDORU reward."]],
  ["ebal", ["AIDORU Account", "Account"]],
  ["deposit", ["Deposit successful!", "Bank"]],
  ["withdraw", ["Withdrawal", "Withdraw"]],
  ["pay", ["Payment sent", "Transfer"]],
  ["donate", ["Donation sent", "Donation"]],
  ["loan", ["Loan", "Account"]],
  ["vault", ["Vault", "Savings"]],
  ["history", ["Transaction history", "Account"]],
  ["diamonds", ["AIDORU Account", "Diamonds"]],
  ["orbs", ["AIDORU Account", "Orbs"]],
  ["work", ["SHIFT COMPLETED", "Work"]],
  ["beg", ["Beg", "Reward"]],
  ["crime", ["Crime", "Reward"]],
  ["rob", ["Robbery", "Reward"]],
  ["heist", ["Heist", "Reward"]],
  ["invest", ["Investment", "Arcade"]],
  ["pool", ["Lottery Pool", "Investment"]],
  ["lottery", ["Lottery", "Arcade"]],
  ["gamble", ["Gamble", "Arcade"]],
  ["bet", ["Bet", "Arcade"]],
  ["blackjack", ["Blackjack", "Arcade"]],
  ["coinflip", ["Coinflip", "Arcade"]],
  ["roulette", ["Roulette", "Arcade"]],
  ["slots", ["Slots", "Arcade"]],
  ["challenge", ["AIDORU Battle", "Pokémon"]],
  ["mart", ["AIDORU Pokémon Mart", "Pokémon items"]],
  ["profile", ["Trainer Profile", "Profile"]],
  ["register", ["Trainer Profile", "Register"]],
  ["lb", ["Leaderboard", "Cards"]],
  ["clb", ["Card Leaderboard", "Cards"]],
  ["slb", ["Series Leaderboard", "Cards"]],
]);

const thumbnailPromises = new Map();

function getThumbnail(fileName) {
  if (!thumbnailPromises.has(fileName)) {
    thumbnailPromises.set(fileName, (async () => {
      for (const directory of ASSET_DIRS) {
        try {
          return await readFile(`${directory}${fileName}`);
        } catch {
          // Try the next known checkout when the Discord repo is deployed alone.
        }
      }
      // AKIRA-DISCORD is also deployed as a standalone checkout. Keep the
      // preview artwork available there without duplicating binary assets.
      return `${REMOTE_ASSET_ORIGIN}/${encodeURIComponent(fileName)}`;
    })());
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
    title: COMMAND_COPY.get(String(commandName || "").toLowerCase())?.[0] || config.title,
    description: COMMAND_COPY.get(String(commandName || "").toLowerCase())?.[1] || config.description,
    jpegThumbnail: await getThumbnail(config.image),
  };
}

export function hasEconomyPreview(commandName) {
  return Boolean(getEconomyPreviewConfig(commandName));
}

export async function buildEconomyExternalAdReply(commandName) {
  const config = getEconomyPreviewConfig(commandName);
  if (!config) return null;
  const thumbnail = await getThumbnail(config.image);
  return {
    title: COMMAND_COPY.get(String(commandName || "").toLowerCase())?.[0] || config.title,
    body: COMMAND_COPY.get(String(commandName || "").toLowerCase())?.[1] || config.description,
    mediaType: 1,
    sourceUrl: config.url,
    thumbnail,
    renderLargerThumbnail: true,
    showAdAttribution: false,
  };
}
