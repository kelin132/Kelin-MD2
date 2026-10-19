import { BSON, ObjectId } from "mongodb";
import { isDeepStrictEqual as equal } from "node:util";

const clone = value => value == null ? value : BSON.deserialize(BSON.serialize({ value })).value;
const at = (doc, key) => key.split(".").reduce((obj, part) => obj?.[part], doc);
function set(doc, key, value) {
  const parts = key.split(".");
  let target = doc;
  for (const part of parts.slice(0, -1)) target = target[part] ??= {};
  target[parts.at(-1)] = clone(value);
}
function condition(actual, expected) {
  if (!expected || typeof expected !== "object" || Array.isArray(expected) || expected instanceof Date || expected instanceof ObjectId) return equal(actual, expected);
  return Object.entries(expected).every(([op, value]) => {
    if (op === "$in") return (Array.isArray(actual) ? actual : [actual]).some(item => value.some(candidate => equal(item, candidate)));
    if (op === "$ne") return !equal(actual, value);
    if (op === "$gte") return actual >= value;
    if (op === "$gt") return actual > value;
    if (op === "$lt") return actual < value;
    if (op === "$lte") return actual <= value;
    if (op === "$exists") return (actual !== undefined) === value;
    if (op === "$not") return !condition(actual, value);
    if (op === "$elemMatch") return Array.isArray(actual) && actual.some(item => matches(item, value));
    throw Error(`Unsupported fixture operator: ${op}`);
  });
}
function matches(doc, query) {
  return Object.entries(query).every(([key, value]) =>
    key === "$or" ? value.some(clause => matches(doc, clause)) : condition(at(doc, key), value));
}
function apply(doc, update, inserted = false) {
  if (Array.isArray(update)) return;
  if (inserted) for (const [key, value] of Object.entries(update.$setOnInsert || {})) set(doc, key, value);
  for (const [key, value] of Object.entries(update.$set || {})) set(doc, key, value);
  for (const [key, value] of Object.entries(update.$inc || {})) set(doc, key, (at(doc, key) || 0) + value);
  for (const [key, value] of Object.entries(update.$max || {})) set(doc, key, Math.max(at(doc, key) || 0, value));
  for (const [key, value] of Object.entries(update.$push || {})) set(doc, key, [...(at(doc, key) || []), value]);
  for (const [key, value] of Object.entries(update.$addToSet || {})) {
    const old = at(doc, key) || [];
    if (!old.some(item => equal(item, value))) set(doc, key, [...old, value]);
  }
  for (const [key, value] of Object.entries(update.$pull || {})) set(doc, key, (at(doc, key) || []).filter(item => !condition(item, value)));
  for (const key of Object.keys(update.$unset || {})) delete doc[key];
}

export function createMemoryDb(initial) {
  const data = clone(initial);
  return {
    data,
    collection(name) {
      const rows = data[name] ??= [];
      return {
        find(query = {}) { return { toArray: async () => rows.filter(row => matches(row, query)).map(clone) }; },
        async findOne(query) { return clone(rows.find(row => matches(row, query))); },
        async countDocuments(query) { return rows.filter(row => matches(row, query)).length; },
        async insertOne(input) {
          const row = { _id: new ObjectId(), ...clone(input) };
          rows.push(row);
          return { insertedId: row._id };
        },
        async updateOne(query, update, options = {}) {
          // Existing migration marker: fixtures must never reset player money.
          if (name === "economy_migrations") return { matchedCount: 1, modifiedCount: 0, upsertedCount: 0 };
          let row = rows.find(item => matches(item, query));
          let inserted = false;
          if (!row && options.upsert) {
            row = { _id: query._id || new ObjectId() };
            for (const [key, value] of Object.entries(query)) if (!key.startsWith("$") && (typeof value !== "object" || value instanceof ObjectId)) set(row, key, value);
            rows.push(row);
            inserted = true;
          }
          if (!row) return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
          const before = clone(row);
          apply(row, update, inserted);
          return { matchedCount: inserted ? 0 : 1, modifiedCount: equal(row, before) ? 0 : 1, upsertedCount: inserted ? 1 : 0 };
        },
        async updateMany(query, update) {
          const selected = rows.filter(row => matches(row, query));
          for (const row of selected) apply(row, update);
          return { modifiedCount: selected.length };
        },
        async findOneAndUpdate(query, update, options = {}) {
          const before = await this.findOne(query);
          await this.updateOne(query, update, options);
          return options.returnDocument === "after"
            ? (before ? this.findOne({ _id: before._id }) : this.findOne(query))
            : before;
        },
      };
    },
  };
}
