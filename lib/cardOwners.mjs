function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function candidateCardIds(value) {
  const id = String(value ?? "").trim();
  const candidates = [id, id.toLowerCase(), id.toUpperCase()];
  if (/^\d+$/.test(id)) {
    const numeric = Number(id);
    if (Number.isSafeInteger(numeric)) candidates.push(numeric);
  }
  return [...new Set(candidates.filter((candidate) => candidate !== ""))];
}

/**
 * Match all persisted copies of a card, including legacy records that used
 * `cardID`/`id` or predate persistent card IDs and only stored name + tier.
 * No obtainedAt filter or result limit is applied.
 */
export function buildCardOwnersPipeline(card) {
  const cardId = String(card?.cardId ?? "").trim();
  const cardIds = candidateCardIds(cardId);
  const lowerIds = [...new Set(cardIds.map((value) => String(value).toLowerCase()))];
  const name = String(card?.name || "").trim();
  const lowerName = name.toLowerCase();
  const tierValues = [...new Set([card?.tierNum, card?.tier]
    .filter((value) => value !== undefined && value !== null && String(value).trim() !== "")
    .map((value) => String(value).trim()))];

  const queryOr = [
    { "cards.cardId": { $in: cardIds } },
    { "cards.cardID": { $in: cardIds } },
    { "cards.id": { $in: cardIds } },
  ];
  if (name && tierValues.length) {
    const tierMatch = [];
    for (const value of tierValues) {
      tierMatch.push({ tierNum: value }, { tier: value });
      const numeric = Number(value);
      if (Number.isSafeInteger(numeric) && String(numeric) === value) {
        tierMatch.push({ tierNum: numeric }, { tier: numeric });
      }
    }
    queryOr.push({
      cards: {
        $elemMatch: {
          cardId: { $in: [null, ""] },
          cardID: { $in: [null, ""] },
          id: { $in: [null, ""] },
          name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
          $or: tierMatch,
        },
      },
    });
  }

  const stringLower = (field) => ({
    $toLower: { $toString: { $ifNull: [field, ""] } },
  });
  const cardIdMatches = ["$$card.cardId", "$$card.cardID", "$$card.id"].map((field) => ({
    $in: [stringLower(field), lowerIds],
  }));
  const legacyMatch = name && tierValues.length
    ? {
        $and: [
          { $eq: [{ $ifNull: ["$$card.cardId", ""] }, ""] },
          { $eq: [{ $ifNull: ["$$card.cardID", ""] }, ""] },
          { $eq: [{ $ifNull: ["$$card.id", ""] }, ""] },
          { $eq: [stringLower("$$card.name"), lowerName] },
          {
            $in: [
              { $toString: { $ifNull: ["$$card.tierNum", "$$card.tier"] } },
              tierValues,
            ],
          },
        ],
      }
    : false;

  return [
    { $match: { $or: queryOr } },
    {
      $project: {
        _id: 1,
        userId: 1,
        whatsappNumber: 1,
        username: 1,
        name: 1,
        cards: {
          $filter: {
            input: { $ifNull: ["$cards", []] },
            as: "card",
            cond: { $or: [...cardIdMatches, legacyMatch].filter(Boolean) },
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        userId: 1,
        whatsappNumber: 1,
        username: 1,
        name: 1,
        matchingCards: "$cards",
        count: { $size: "$cards" },
      },
    },
    { $match: { count: { $gt: 0 } } },
  ];
}

export function ownerJid(user) {
  const raw = String(
    user?.whatsappNumber || user?.userId || user?.jid || user?._id || "",
  ).trim();
  if (!raw || raw.toLowerCase() === "discord") return "";
  if (raw.includes("@")) return raw.toLowerCase();
  if (/^discord:/i.test(raw)) return raw.toLowerCase();
  const digits = raw.replace(/\D/g, "");
  const looksLikePhone = /^\+?[\d\s().-]+$/.test(raw);
  return looksLikePhone && digits.length >= 7 ? `${digits}@s.whatsapp.net` : "";
}

export function isMentionableOwner(jid) {
  return typeof jid === "string" &&
    (jid.endsWith("@s.whatsapp.net") || jid.endsWith("@lid"));
}

export function collapseCardOwners(records) {
  const owners = new Map();
  for (const record of records || []) {
    const jid = ownerJid(record);
    if (!jid) continue;
    const label = record.username || record.name ||
      (jid.startsWith("discord:") ? `Discord ${jid.slice(8)}` : `@${jid.split("@")[0]}`);
    let owner = owners.get(jid);
    if (!owner) {
      owner = { jid, label, count: 0, _seenSpawnIds: new Set() };
      owners.set(jid, owner);
    } else if ((!owner.label || owner.label.startsWith("@")) && record.username) {
      owner.label = record.username;
    }

    const matchingCards = Array.isArray(record.matchingCards) ? record.matchingCards : [];
    if (matchingCards.length) {
      for (const card of matchingCards) {
        const spawnId = String(card?.spawnId || "");
        const cardId = String(card?.cardId || "");
        const copyKey = spawnId && spawnId !== cardId ? spawnId : "";
        if (copyKey && owner._seenSpawnIds.has(copyKey)) continue;
        if (copyKey) owner._seenSpawnIds.add(copyKey);
        owner.count += 1;
      }
    } else {
      owner.count += Math.max(0, Number(record.count) || 0);
    }
  }

  return [...owners.values()].map(({ _seenSpawnIds, ...owner }) => owner);
}
