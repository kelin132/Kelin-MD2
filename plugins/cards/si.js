import { findOrCreateUser, Col, uid } from "./db.js";
import { fetchAllCards, getCard, resolveMediaUrl } from "../../lib/cardApi.mjs";

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

async function resolveCard(query, ownedCards) {
  const needle = normaliseQuery(query);
  const owned = ownedCards.find((card) =>
    normaliseQuery(card.cardId) === needle ||
    normaliseQuery(card.name).includes(needle)
  );
  if (owned) return owned;

  const apiCard = await getCard(query);
  if (apiCard) return apiCard;

  const closest = findClosest(await fetchAllCards(), query);
  return closest && closest.score <= Math.max(2, Math.floor(needle.length * 0.4))
    ? closest.card
    : null;
}

function ownerJid(user) {
  return user.whatsappNumber || `${user.userId}@s.whatsapp.net`;
}

export default {
  name: "si",
  aliases: ["seriesinfo"],
  category: "cards",
  description: "Show card owners and preview a series card",
  usage: ".si <card name or ID>",

  async run({ sock, msg, args, sender }) {
    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      const input = args.join(" ").trim();
      if (!input) return reply("❌ Usage: .si <card name or ID>");

      const currentUser = await findOrCreateUser(sender);
      const card = await resolveCard(input, Array.isArray(currentUser.cards) ? currentUser.cards : []);
      if (!card) return reply(`❌ No card found matching "${input}".`);

      const users = await (await Col.users()).find(
        { "cards.cardId": card.cardId },
        { projection: { userId: 1, whatsappNumber: 1, username: 1, cards: 1 } }
      ).toArray();

      const owners = [];
      for (const user of users) {
        (user.cards || []).forEach((owned, index) => {
          if (owned.cardId !== card.cardId) return;
          owners.push({
            jid: ownerJid(user),
            label: user.username || `@${uid(ownerJid(user))}`,
            spawnId: owned.spawnId || null,
          });
        });
      }

      const mentions = owners.map((owner) => owner.jid);

      const ownerLines = owners.length
        ? owners.map((owner, i) =>
            `${i + 1}. ${owner.label}${owner.spawnId ? ` · ${owner.spawnId}` : ""}`
          ).join("\n")
        : "  _No owners yet_";

      const text =
`╭━━━━━━━━━━━━━━━━━━━━╮
│  📚 *Series Info*
╰━━━━━━━━━━━━━━━━━━━━╯

🗂️ *${card.series || "Unknown"}*
🃏 ${card.name}
⭐ Tier: ${card.tierNum || card.tier || "Unknown"}

━━━━━━━━━━━━━━━━━━━━━
👥 *Owners (${owners.length})*
━━━━━━━━━━━━━━━━━━━━━
${ownerLines}`;

      if (card.media) {
        const imageUrl = await resolveMediaUrl(card.media);
        return sock.sendMessage(jid, {
          image: { url: imageUrl },
          caption: text,
          mentions,
        }, { quoted: msg });
      }

      return sock.sendMessage(jid, { text, mentions }, { quoted: msg });
    } catch (err) {
      console.error("SI ERROR:", err);
      return reply("❌ Failed to load series card info.");
    }
  },
};