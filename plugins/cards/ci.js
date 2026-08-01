import { findOrCreateUser, Col, uid } from "./db.js";
import { fetchAllCards, getCard, searchCards } from "../../lib/cardApi.mjs";

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
  if (!needle) return null;

  return cards
    .map((card) => {
      const name = normaliseQuery(card.name);
      const series = normaliseQuery(card.series);
      const score = name.includes(needle)
        ? 0
        : Math.min(distance(needle, name), distance(needle, series));
      return { card, score };
    })
    .sort((a, b) => a.score - b.score)[0] || null;
}

async function resolveCard(query, ownedCards) {
  const needle = normaliseQuery(query);

  // Collect ALL owned cards that match — not just the first one
  const matches = ownedCards
    .map((card, i) => ({ card, index: i }))
    .filter(({ card }) =>
      normaliseQuery(card.cardId) === needle ||
      normaliseQuery(card.name).includes(needle)
    );

  if (matches.length === 1) return { card: matches[0].card, collectionIndex: matches[0].index };
  if (matches.length > 1)  return { duplicates: matches };   // caller handles this

  const card = await getCard(query);
  if (card) return { card, collectionIndex: -1 };

  const all = await fetchAllCards();
  const closest = findClosest(all, query);
  return closest && closest.score <= Math.max(2, Math.floor(needle.length * 0.4))
    ? { card: closest.card, collectionIndex: -1 }
    : null;
}

async function getCardIssue(cardId, sender, collectionIndex) {
  if (collectionIndex < 0) return null;

  const users = await (await Col.users()).find(
    { "cards.cardId": cardId },
    { projection: { userId: 1, cards: 1 } }
  ).toArray();

  let issue = 0;
  for (const user of users) {
    for (let index = 0; index < (user.cards || []).length; index++) {
      if (user.cards[index].cardId !== cardId) continue;
      issue++;
      if (user.userId === uid(sender) && index === collectionIndex) return issue;
    }
  }
  return null;
}

export default {
  name: "cardinfo",
  aliases: ["cinfo", "ci"],
  category: "cards",
  description: "Get detailed info about a card in your collection",
  usage: ".ci <name, ID, or collection index>",

  async run({ sock, msg, args, sender }) {
    const jid   = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      const input = args.join(" ").trim();
      if (!input) return reply("❌ Usage: .ci <card name, ID, or collection index>");

      const user = await findOrCreateUser(sender);
      const ownedCards = Array.isArray(user.cards) ? user.cards : [];
      const numericIndex = /^\d+$/.test(input) ? Number(input) - 1 : -1;

      let card, collectionIndex;

      if (numericIndex >= 0 && numericIndex < ownedCards.length) {
        card = ownedCards[numericIndex];
        collectionIndex = numericIndex;
      } else {
        const result = await resolveCard(input, ownedCards);

        if (!result) {
          const similar = await searchCards(input, 5);
          if (similar.length) {
            let suggest = `╭─❀「 🎴 *𝐂𝐀𝐑𝐃 𝐈𝐍𝐅𝐎* 」❀─╮\n│ ❌ Card not found. Did you mean:\n│\n`;
            similar.forEach((c, i) => { suggest += `│ ${i + 1}. *${c.name}* — \`${c.cardId}\`\n`; });
            suggest += `╰───────────────❀`;
            return reply(suggest);
          }
          return reply(
`╭─❀「 🎴 *𝐂𝐀𝐑𝐃 𝐈𝐍𝐅𝐎* 」❀─╮
│ ❌ No card found matching
│    _"${input}"_
╰───────────────❀`
          );
        }

        // Multiple owned cards share the same name — show a picker
        if (result.duplicates) {
          let msg = `╭─❀「 🎴 *𝐂𝐀𝐑𝐃 𝐈𝐍𝐅𝐎* 」❀─╮\n│ ⚠️ Multiple cards match that name!\n│ Use *.ci <collection #>* to pick one:\n│\n`;
          result.duplicates.forEach(({ card: c, index: i }) => {
            msg += `│ *#${i + 1}* — ${c.name} · \`${c.cardId}\`\n`;
          });
          msg += `╰───────────────❀`;
          return reply(msg);
        }

        card = result.card;
        collectionIndex = result.collectionIndex;
      }
      const issue = await getCardIssue(card.cardId, sender, collectionIndex);

      const collNum  = collectionIndex >= 0 ? collectionIndex + 1 : null;
      const spawnId  = card.spawnId || "—";
      const indexVal = card.index != null
        ? card.index
        : collNum ?? "—";
      const issueVal = issue ? `#${issue}` : "—";
      const tier     = card.tierNum || card.tier || "—";
      const series   = card.series  || "—";

      const tierStars =
        typeof tier === "number" || /^\d+$/.test(String(tier))
          ? "⭐".repeat(Math.min(Number(tier), 5))
          : null;

      const text =
`╭━━━━━━━━━━━━━━━━━━━━╮
│  🃏 *Card Info*
╰━━━━━━━━━━━━━━━━━━━━╯

✨ *${card.name || "Unknown"}*${collNum ? `  ·  #${collNum}` : ""}
📚 ${series}

━━━━━━━━━━━━━━━━━━━━━
⭐ *Tier:*     ${tier}${tierStars ? `  ${tierStars}` : ""}
🏷️ *Spawn ID:* ${spawnId}
🔢 *Index:*    ${indexVal}
📌 *Issue:*    ${issueVal}
━━━━━━━━━━━━━━━━━━━━━`;

      return reply(text);

    } catch (err) {
      console.error("CI ERROR:", err);
      return reply("❌ Command failed.");
    }
  },
};
