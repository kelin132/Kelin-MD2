import { fetchAllCards, getCard, sendCardMedia, TIER_NAME, TIER_EMOJI } from "../../lib/cardApi.mjs";
import { Col, uid } from "./db.js";

function normaliseQuery(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j];
      row[j] = a[i - 1] === b[j - 1]
        ? diagonal
        : Math.min(diagonal + 1, row[j] + 1, row[j - 1] + 1);
      diagonal = above;
    }
  }
  return row[b.length];
}

function findClosest(cards, query) {
  const needle = normaliseQuery(query);
  return cards
    .map((card) => {
      const name = normaliseQuery(card.name);
      const series = normaliseQuery(card.series);
      const score = name.includes(needle)
        ? 0
        : Math.min(distance(needle, name), distance(needle, series));
      return { card, score };
    })
    .sort((a, b) => a.score - b.score)[0];
}

/**
 * Parse the user input into a card-name query and an optional tier number.
 * "roronoa zoro 6"  → { nameQuery: "roronoa zoro", tier: "6" }
 * "roronoa zoro"    → { nameQuery: "roronoa zoro", tier: null }
 */
function parseInput(raw) {
  const tokens = raw.trim().split(/\s+/);
  const last = tokens[tokens.length - 1];

  const tierMap = {
    "1": "1", "2": "2", "3": "3", "4": "4", "5": "5", "6": "6", "s": "S",
    "t1": "1", "t2": "2", "t3": "3", "t4": "4", "t5": "5", "t6": "6", "ts": "S",
    "common": "1", "uncommon": "2", "rare": "3", "epic": "4",
    "legendary": "5", "mythical": "6", "secret": "S",
  };

  const tierKey = last.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (tierMap[tierKey]) {
    return { nameQuery: tokens.slice(0, -1).join(" "), tier: tierMap[tierKey] };
  }

  if (tokens.length >= 2) {
    const lastTwo = tokens.slice(-2).join(" ").toLowerCase();
    const tierFromTwo = tierMap[lastTwo.replace(/[^a-z0-9]/g, "")];
    if (tierFromTwo) {
      return { nameQuery: tokens.slice(0, -2).join(" "), tier: tierFromTwo };
    }
  }

  return { nameQuery: raw, tier: null };
}

/**
 * Find all cards matching a name query across all tiers.
 */
async function resolveCardsByName(query) {
  const all = await fetchAllCards();
  const needle = normaliseQuery(query);

  const exact = all.filter((c) => normaliseQuery(c.name) === needle);
  if (exact.length) return exact;

  const partial = all.filter((c) => normaliseQuery(c.name).includes(needle));
  if (partial.length) return partial;

  const closest = findClosest(all, query);
  if (closest && closest.score <= Math.max(2, Math.floor(needle.length * 0.4))) {
    return all.filter((c) => c.name === closest.card.name);
  }

  return [];
}

function ownerJid(user) {
  return user.whatsappNumber || `${user.userId}@s.whatsapp.net`;
}

async function getOwners(cardId) {
  const users = await (await Col.users()).find(
    { "cards.cardId": cardId },
    { projection: { userId: 1, whatsappNumber: 1, username: 1, cards: 1 } }
  ).toArray();

  const owners = [];
  for (const user of users) {
    (user.cards || []).forEach((owned) => {
      if (owned.cardId !== cardId) return;
      owners.push({
        jid: ownerJid(user),
        label: user.username || `@${uid(ownerJid(user))}`,
        spawnId: owned.spawnId || null,
      });
    });
  }
  return owners;
}

function tierLabel(tierNum) {
  const name = TIER_NAME[tierNum] || "Unknown";
  const emoji = TIER_EMOJI[name] || "";
  return `${emoji} T${tierNum} ${name}`;
}

export default {
  name: "si",
  aliases: ["seriesinfo"],
  category: "cards",
  description: "Show card owners and preview a series card (optionally by tier)",
  usage: ".si <card name> [tier]",

  async run({ sock, msg, args, sender }) {
    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      const input = args.join(" ").trim();
      if (!input) return reply("❌ Usage: .si <card name> [tier]\n\nExample: .si roronoa zoro 6");

      const { nameQuery, tier } = parseInput(input);
      if (!nameQuery) return reply("❌ Usage: .si <card name> [tier]\n\nExample: .si roronoa zoro 6");

      const matches = await resolveCardsByName(nameQuery);
      if (matches.length === 0) {
        return reply(`❌ No card found matching "${nameQuery}".`);
      }

      const byTier = new Map();
      for (const card of matches) {
        const key = String(card.tierNum); // normalize to string so "6" === "6" always
        if (!byTier.has(key)) byTier.set(key, []);
        byTier.get(key).push(card);
      }

      const tierOrder = ["1", "2", "3", "4", "5", "6", "S"];
      const sortedTiers = [...byTier.keys()].sort(
        (a, b) => tierOrder.indexOf(a) - tierOrder.indexOf(b)
      );

      // ── Tier specified: show that specific tier ────────────────────────────
      if (tier) {
        const tierCards = byTier.get(tier);
        if (!tierCards || tierCards.length === 0) {
          const available = sortedTiers.map((t) => `T${t}`).join(", ");
          return reply(
            `❌ No *${tierLabel(tier)}* version of "${matches[0].name}" found.\n\nAvailable tiers: ${available}`
          );
        }

        const card = tierCards[0];
        const owners = await getOwners(card.cardId);
        const mentions = owners.map((o) => o.jid);

        const ownerLines = owners.length
          ? owners.map((owner, i) =>
              `${i + 1}. ${owner.label}${owner.spawnId ? ` · ${owner.spawnId}` : ""}`
            ).join("\n")
          : "  _No owners yet_";

        const text =
`╭━━━━━━━━━━━━━━━━━━━━╮\n│  📚 *Series Info*\n╰━━━━━━━━━━━━━━━━━━━━╯\n\n🗂️ *${card.series || "Unknown"}*\n🃏 ${card.name}\n⭐ ${tierLabel(card.tierNum)}\n\n━━━━━━━━━━━━━━━━━━━━━\n👥 *Owners (${owners.length})*\n━━━━━━━━━━━━━━━━━━━━━\n${ownerLines}\n\n━━━━━━━━━━━━━━━━━━━━━\n💡 _Other tiers: .si ${card.name} <tier>_\nAvailable: ${sortedTiers.map((t) => `T${t}`).join(", ")}`;

        if (card.media) {
          return sendCardMedia(sock, jid, card, text, { quoted: msg, mentions });
        }
        return sock.sendMessage(jid, { text, mentions }, { quoted: msg });
      }

      // ── No tier specified ───────────────────────────────────────────────────
      if (sortedTiers.length === 1) {
        const card = byTier.get(sortedTiers[0])[0];
        const owners = await getOwners(card.cardId);
        const mentions = owners.map((o) => o.jid);

        const ownerLines = owners.length
          ? owners.map((owner, i) =>
              `${i + 1}. ${owner.label}${owner.spawnId ? ` · ${owner.spawnId}` : ""}`
            ).join("\n")
          : "  _No owners yet_";

        const text =
`╭━━━━━━━━━━━━━━━━━━━━╮\n│  📚 *Series Info*\n╰━━━━━━━━━━━━━━━━━━━━╯\n\n🗂️ *${card.series || "Unknown"}*\n🃏 ${card.name}\n⭐ ${tierLabel(card.tierNum)}\n\n━━━━━━━━━━━━━━━━━━━━━\n👥 *Owners (${owners.length})*\n━━━━━━━━━━━━━━━━━━━━━\n${ownerLines}`;

        if (card.media) {
          return sendCardMedia(sock, jid, card, text, { quoted: msg, mentions });
        }
        return sock.sendMessage(jid, { text, mentions }, { quoted: msg });
      }

      // Multiple tiers — show a summary of all tiers with owner counts
      const tierSummaries = [];
      let totalOwners = 0;
      let mentions = [];

      for (const t of sortedTiers) {
        const card = byTier.get(t)[0];
        const owners = await getOwners(card.cardId);
        totalOwners += owners.length;
        mentions.push(...owners.map((o) => o.jid));

        const ownerPreview = owners.length
          ? owners.slice(0, 5).map((o, i) => `   ${i + 1}. ${o.label}`).join("\n") +
            (owners.length > 5 ? `\n   _...and ${owners.length - 5} more_` : "")
          : "   _No owners yet_";

        tierSummaries.push(
`┃  ${tierLabel(t)} — ${owners.length} owner${owners.length !== 1 ? "s" : ""}\n${ownerPreview}\n┃  💡 _.si ${card.name} ${t}_ for details`
        );
      }

      const text =
`╭━━━━━━━━━━━━━━━━━━━━╮\n│  📚 *Series Info*\n╰━━━━━━━━━━━━━━━━━━━━╯\n\n🗂️ *${matches[0].series || "Unknown"}*\n🃏 ${matches[0].name}\n\n━━━━━━━━━━━━━━━━━━━━━\n📊 *All Tiers — ${totalOwners} total owners*\n━━━━━━━━━━━━━━━━━━━━━\n${tierSummaries.join("\n┃\n")}\n\n━━━━━━━━━━━━━━━━━━━━━\n💡 _.si <name> <tier>_ for a specific tier`;

      const previewCard = byTier.get(sortedTiers[0])[0];
      if (previewCard.media) {
        return sendCardMedia(sock, jid, previewCard, text, { quoted: msg, mentions });
      }
      return sock.sendMessage(jid, { text, mentions }, { quoted: msg });

    } catch (err) {
      console.error("SI ERROR:", err);
      return reply("❌ Failed to load series card info.");
    }
  },
};
