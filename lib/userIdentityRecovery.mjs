/**
 * Safe recovery helpers for the WhatsApp JID/LID migration.
 *
 * Recovery is intentionally additive:
 * - the legacy document is never deleted;
 * - the current document keeps non-empty values already present;
 * - a recovery audit record is written before any changes;
 * - linked game records are only moved when the target identity has no
 *   conflicting record in that collection.
 */
import { getDb } from "./mongo.mjs";
import { normalizePhoneNumber, phoneJid } from "./whatsappIdentity.mjs";

const LINKED_COLLECTIONS = [
  { name: "mn_users", field: "userId", bare: true, phoneField: "whatsappNumber" },
  { name: "pokemon_trainers", field: "jid" },
  { name: "dbz_players", field: "jid" },
  { name: "dbz_fighters", field: "ownerJid" },
  { name: "companies", field: "ownerId" },
  { name: "naruto_players", field: "jid" },
  { name: "pokemon_owned", field: "ownerJid" },
];

function unique(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function bare(value) {
  return String(value || "").split("@")[0].split(":")[0];
}

function isPhone(value) {
  return /@(?:s\.whatsapp\.net|c\.us)$/.test(String(value || "")) ||
    /^\+?\d[\d\s().:-]*$/.test(String(value || ""));
}

function identityVariants(value, { bareOnly = false } = {}) {
  const raw = String(value || "").trim();
  if (!raw) return [];

  const values = [raw, bare(raw)];
  if (isPhone(raw)) {
    const number = normalizePhoneNumber(raw);
    if (number) values.push(number, phoneJid(number), `${number}@c.us`);
  }
  return unique(bareOnly ? [bare(raw)] : values);
}

function valueIsEmpty(value) {
  return value === undefined ||
    value === null ||
    value === "" ||
    (typeof value === "number" && value === 0) ||
    (Array.isArray(value) && value.length === 0) ||
    (value && typeof value === "object" && !Array.isArray(value) &&
      Object.keys(value).length === 0);
}

function shouldRestore(current, legacy) {
  if (legacy === undefined || legacy === null) return false;
  if (valueIsEmpty(current)) return !valueIsEmpty(legacy);
  if (typeof current === "string" && current.trim().toLowerCase() === "user") {
    return typeof legacy === "string" && legacy.trim() && legacy.trim().toLowerCase() !== "user";
  }
  if (typeof current === "boolean" && current === false && legacy === true) return true;
  return false;
}

function mergeDocument(current, legacy, identityField) {
  // A phone-keyed record created after the migration can be an unregistered
  // placeholder produced by a command that ran before identity resolution
  // completed. In that case the LID record is the authoritative profile.
  if (current?.registered !== true && legacy?.registered === true) {
    return { ...legacy };
  }

  const merged = { ...current };
  for (const [key, value] of Object.entries(legacy || {})) {
    if (key === "_id" || key === identityField || key === "identityRecovery") continue;
    if (shouldRestore(current?.[key], value)) merged[key] = value;
  }
  return merged;
}

function filterFor(field, values) {
  return { [field]: { $in: values } };
}

function targetKey(targetId, descriptor) {
  if (descriptor.bare) return bare(targetId);
  return targetId;
}

function sourceValues(sourceId, descriptor) {
  return identityVariants(sourceId, { bareOnly: descriptor.bare });
}

function targetValues(targetId, descriptor) {
  return identityVariants(targetId, { bareOnly: descriptor.bare });
}

function publicUserSummary(user) {
  if (!user) return null;
  return {
    id: String(user._id),
    name: user.name || "User",
    registered: user.registered === true,
    money: Number(user.money || 0),
    bank: Number(user.bank || 0),
    vault: Number(user.vault || 0),
    level: Number(user.level || 1),
    xp: Number(user.xp || 0),
    inventoryItems: Array.isArray(user.inventory) ? user.inventory.length : 0,
    historyEntries: Array.isArray(user.history) ? user.history.length : 0,
  };
}

function publicLinkedSummary(entry, sourceCount, targetCount, moved) {
  return {
    collection: entry.name,
    sourceRecords: sourceCount,
    targetRecords: targetCount,
    moved,
  };
}

async function findUser(db, id) {
  const values = identityVariants(id);
  if (!values.length) return null;
  return db.collection("users").findOne({ _id: { $in: values } });
}

async function linkedPreview(db, sourceId, targetId) {
  const result = [];
  for (const entry of LINKED_COLLECTIONS) {
    const collection = db.collection(entry.name);
    const sources = await collection.find(
      filterFor(entry.field, sourceValues(sourceId, entry)),
    ).toArray();
    const targets = await collection.find(
      filterFor(entry.field, targetValues(targetId, entry)),
    ).toArray();
    result.push({
      entry,
      sources,
      targets,
      summary: publicLinkedSummary(entry, sources.length, targets.length, 0),
    });
  }
  return result;
}

/**
 * Create a dry-run recovery plan. No writes happen here.
 */
export async function previewUserIdentityRecovery(sourceId, targetId) {
  const source = String(sourceId || "").trim();
  const target = String(targetId || "").trim();
  if (!source || !target) throw new Error("Both the old and new WhatsApp IDs are required.");
  if (source === target) throw new Error("The old and new WhatsApp IDs must be different.");

  const db = await getDb();
  const [legacy, current, linked] = await Promise.all([
    findUser(db, source),
    findUser(db, target),
    linkedPreview(db, source, target),
  ]);

  if (!legacy) {
    throw new Error(`No legacy user record was found for ${source}.`);
  }

  return {
    sourceId: source,
    targetId: target,
    legacy,
    current,
    linked,
    legacySummary: publicUserSummary(legacy),
    currentSummary: publicUserSummary(current),
    linkedSummary: linked.map((item) => item.summary),
  };
}

/**
 * Apply a previously reviewed recovery plan.
 *
 * This function re-checks the source and target records immediately before
 * writing, so the owner cannot accidentally confirm a stale preview.
 */
export async function restoreUserIdentity(sourceId, targetId) {
  const plan = await previewUserIdentityRecovery(sourceId, targetId);
  const db = await getDb();
  const users = db.collection("users");
  const now = new Date();

  const audit = {
    operation: "restoreuser",
    sourceId: plan.sourceId,
    targetId: plan.targetId,
    createdAt: now,
    sourceUser: plan.legacy,
    targetUserBefore: plan.current || null,
    linkedSummary: plan.linkedSummary,
    status: "started",
  };
  const auditResult = await db.collection("identity_recovery_audit").insertOne(audit);

  try {
    const source = await findUser(db, plan.sourceId);
    const current = await findUser(db, plan.targetId);
    if (!source) throw new Error("The legacy record disappeared before recovery could start.");

    const target = plan.targetId;
    if (!current) {
      const { _id, ...legacyData } = source;
      await users.insertOne({
        _id: target,
        ...legacyData,
        identityAliases: unique([...(legacyData.identityAliases || []), String(_id)]),
        identityRecoveredAt: now,
      });
    } else {
      const merged = mergeDocument(current, source, "_id");
      merged.identityAliases = unique([
        ...(current.identityAliases || []),
        String(source._id),
      ]);
      merged.identityRecoveredAt = now;
      const { _id, ...updates } = merged;
      await users.updateOne({ _id: current._id }, { $set: updates });
    }

    const linkedSummary = [];
    for (const item of plan.linked) {
      const { entry, sources, targets } = item;
      const collection = db.collection(entry.name);
      let moved = 0;
      const sourceFilter = filterFor(entry.field, sourceValues(plan.sourceId, entry));

      if (sources.length && targets.length === 0) {
        const set = { [entry.field]: targetKey(plan.targetId, entry) };
        if (entry.phoneField && isPhone(plan.targetId)) {
          set[entry.phoneField] = plan.targetId;
        }
        const result = await collection.updateMany(sourceFilter, { $set: set });
        moved = result.modifiedCount;
      } else if (entry.bare && entry.phoneField && isPhone(plan.targetId) && targets.length > 0) {
        // Card records intentionally key users by the bare numeric ID. The
        // source and target therefore point at the same card document; only
        // refresh its display/phone identity.
        const result = await collection.updateMany(
          filterFor(entry.field, targetValues(plan.targetId, entry)),
          { $set: { [entry.phoneField]: plan.targetId } },
        );
        moved = result.modifiedCount;
      }

      linkedSummary.push(publicLinkedSummary(entry, sources.length, targets.length, moved));
    }

    await db.collection("identity_recovery_audit").updateOne(
      { _id: auditResult.insertedId },
      { $set: { status: "completed", completedAt: new Date(), linkedSummary } },
    );

    return {
      ...plan,
      linkedSummary,
      auditId: String(auditResult.insertedId),
      restored: true,
    };
  } catch (error) {
    await db.collection("identity_recovery_audit").updateOne(
      { _id: auditResult.insertedId },
      { $set: { status: "failed", failedAt: new Date(), error: String(error.message || error) } },
    ).catch(() => {});
    throw error;
  }
}
