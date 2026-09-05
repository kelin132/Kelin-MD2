/**
 * KELIN MD — database.js (backward-compat shim)
 * All logic lives in db.js. This file re-exports everything so older
 * plugin versions that import from "./database.js" still work.
 */
export * from "./db.js";
