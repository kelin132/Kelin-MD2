// Run this before importing any bot module. Some plugins have native or
// optional dependencies, and direct `node index.js` panel commands otherwise
// fail before npm start has a chance to install an updated dependency tree.
await import("./scripts/auto-update.mjs");
await import("dotenv/config");

const { connectDiscord } = await import("./lib/discord.mjs");
const { loadPlugins, routeDiscordMessage, routeDiscordInteraction } = await import("./lib/pluginManager.mjs");
const { initGroupSettings } = await import("./lib/groupSettings.js");
const {
  handleDiscordAntiLink,
  handleDiscordMemberJoin,
  handleDiscordMemberLeave,
} = await import("./lib/discordGroupEvents.mjs");
const { startDiscordSpawners } = await import("./lib/discordSpawners.mjs");
const { log } = await import("./lib/logger.mjs");
const { closeDb, connectDb } = await import("./lib/mongo.mjs");
const { startHealthServer } = await import("./lib/health.mjs");

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const PREFIX = process.env.PREFIX || ".";
const OWNER_ID = process.env.DISCORD_OWNER_ID || "";

if (!DISCORD_TOKEN) {
  log("error", "DISCORD_TOKEN is missing. Add it to the hosting provider's secret settings.");
  process.exit(1);
}

async function start() {
  console.log("\n" + "═".repeat(50));
  console.log("  AKIRA-DISCORD — Starting");
  console.log("═".repeat(50));
  console.log(`  Prefix  : ${PREFIX}`);
  console.log("═".repeat(50) + "\n");

  const healthServer = process.env.DISABLE_HEALTH_SERVER === "true"
    ? null
    : startHealthServer({ port: process.env.PORT || 8080 });

  try {
    await connectDb();
    log("info", "Connected to the shared Kelin-MD2 MongoDB database");
    await initGroupSettings();

    const { totalPlugins, totalCommands } = await loadPlugins(PREFIX);
    log("info", `Plugins loaded: ${totalPlugins} plugins, ${totalCommands} commands`);

    const client = await connectDiscord(DISCORD_TOKEN);
    startDiscordSpawners(client);
    client.on("messageCreate", (message) => {
      handleDiscordAntiLink(message)
        .then((blocked) => blocked || routeDiscordMessage(client, message, PREFIX, OWNER_ID))
        .catch((error) => {
        log("error", `Unhandled message error: ${error.stack || error.message}`);
      });
    });
    client.on("guildMemberAdd", (member) => {
      handleDiscordMemberJoin(member).catch((error) => {
        log("error", `Welcome handler failed: ${error.stack || error.message}`);
      });
    });
    client.on("guildMemberRemove", (member) => {
      handleDiscordMemberLeave(member).catch((error) => {
        log("error", `Goodbye handler failed: ${error.stack || error.message}`);
      });
    });
    client.on("interactionCreate", (interaction) => {
      routeDiscordInteraction(client, interaction, PREFIX, OWNER_ID).catch((error) => {
        log("error", `Unhandled interaction error: ${error.stack || error.message}`);
      });
    });

    const shutdown = async (signal) => {
      log("info", `${signal} received; shutting down gracefully`);
      healthServer?.close();
      client.destroy();
      await closeDb();
      process.exit(0);
    };

    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));
    log("info", "AKIRA-DISCORD is now running");
  } catch (error) {
    healthServer?.close();
    log("error", `Startup failed: ${error.stack || error.message}`);
    await closeDb().catch(() => {});
    process.exit(1);
  }
}

start();
