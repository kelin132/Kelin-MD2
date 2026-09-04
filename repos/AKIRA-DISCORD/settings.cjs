/**
 * Shared legacy settings module.
 *
 * Most of AKIRA-DISCORD uses environment variables directly, but several
 * reused Kelin-MD2 modules still load this CommonJS file. Keep the values
 * here intentionally small and environment-driven so importing those modules
 * never makes Discord startup depend on a WhatsApp-only configuration file.
 */
module.exports = {
  packname: process.env.PACKNAME || "AKIRA",
  botName: process.env.BOT_NAME || "AKIRA",
  botOwner: process.env.OWNER_NAME || "KELIN-MD",
  ownerNumber: process.env.OWNER_NUMBER || "",
  ownerContact: process.env.OWNER_CONTACT || process.env.OWNER_NUMBER || "",
  commandMode: "private",
  maxStoreMessages: 20,
  storeWriteInterval: 10_000,
  description: "AKIRA — a multi-purpose Discord companion bot.",
  version: "1.0.0",
  githubRepo: "https://github.com/kelin132/AKIRA-DISCORD.git",
  githubBranch: "master",
  updateZipUrl: "https://github.com/kelin132/AKIRA-DISCORD/archive/refs/heads/master.zip",
  autoUpdateInterval: 39,
};