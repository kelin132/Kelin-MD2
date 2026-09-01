/**
 * KELIN MD — Bot connection manager (standalone, panel-compatible)
 */
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import path from "path";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { log } from "./logger.mjs";
import { routeMessage, getAfkUser, deleteAfkUser } from "./pluginManager.mjs";
import { getDb } from "./mongo.mjs";
import {
  BOT_HEARTBEAT_INTERVAL_MS,
  heartbeatBot,
  markBotOffline,
  markBotOnline,
} from "./botRegistry.mjs";
import { antiLinkHandler } from "../plugins/group/antilinkHandler.js";
import { antibadwordHandler } from "../plugins/group/antibadwordHandler.js";
import { antispamHandler } from "../plugins/group/antispamHandler.js";
import { antimentionHandler } from "../plugins/group/antimentionHandler.js";
import { mutedUserHandler } from "../plugins/group/mutedUserHandler.js";
import { akiraHandler } from "./akiraHandler.mjs";
import { handleTodText } from "./todGame.mjs";
import { handleAnimeQuizText } from "./animeQuizGame.mjs";
import { getUser, saveUser } from "../plugins/economy/database.js";
import { handleGroupParticipants } from "./groupEventHandler.mjs";
import { recordGroupActivity } from "./groupSettings.js";
import { handleKordGameText } from "./kordGames.mjs";
import { createRequire } from "module";
import pino from "pino";
import { getRuntimeSettings } from "./runtimeSettings.mjs";

// settings.js is CommonJS — import via createRequire for ESM compatibility
const _require  = createRequire(import.meta.url);
const _settings = _require("../settings.cjs");

const SESSION_DIR = path.resolve("sessions", "auth");
const INITIAL_RUNTIME_SETTINGS = getRuntimeSettings();
const BOT_NAME = INITIAL_RUNTIME_SETTINGS.botName || process.env.BOT_NAME || _settings.botName || "KELIN MD";

// Silent Baileys-internal logger
const silentLogger = pino({ level: "silent" });

let sock           = null;
let reconnectTimer = null;
let heartbeatTimer = null;
const processStartedAt = new Date();
let _prefix        = INITIAL_RUNTIME_SETTINGS.prefix || ".";
let _phoneNumber   = null; // persisted across reconnects
let manualRestart  = false;
const messageQueues = new Map();
const MAX_PENDING_MESSAGES_PER_KEY = 3;
const MAX_CONCURRENT_COMMANDS_PER_KEY = 2;

export function hasSession() {
  const credsPath = path.join(SESSION_DIR, "creds.json");
  if (!existsSync(credsPath)) return false;
  try {
    const creds = JSON.parse(readFileSync(credsPath, "utf8"));
    return creds.registered === true;
  } catch {
    return false;
  }
}

export function getPrefix() { return getRuntimeSettings().prefix || _prefix; }

export function getSocket() {
  return sock;
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export function restartConnection() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (!sock) {
    reconnectTimer = setTimeout(() => connectBot(null, _prefix), 250);
    return;
  }

  manualRestart = true;
  try {
    sock.ws?.close();
  } catch (err) {
    log("warn", `Socket restart close failed: ${err.message}`);
    manualRestart = false;
    sock = null;
    reconnectTimer = setTimeout(() => connectBot(null, _prefix), 250);
  }
}

function cleanupMessageQueue(queueKey, queue) {
  if (
    queue.pending === 0 &&
    queue.commandActive === 0 &&
    queue.commandPending.length === 0 &&
    messageQueues.get(queueKey) === queue
  ) {
    messageQueues.delete(queueKey);
  }
}

function drainCommandQueue(queueKey, queue) {
  while (
    queue.commandActive < MAX_CONCURRENT_COMMANDS_PER_KEY &&
    queue.commandPending.length > 0
  ) {
    const next = queue.commandPending.shift();
    queue.commandActive += 1;

    Promise.resolve()
      .then(next)
      .catch((err) => {
        log("error", "Plugin error: " + String(err));
      })
      .finally(() => {
        queue.commandActive -= 1;
        cleanupMessageQueue(queueKey, queue);
        drainCommandQueue(queueKey, queue);
      })
      .catch(() => {});
  }
}

function queueIncomingMessage(msg, handler) {
  const remoteJid = msg.key?.remoteJid || "";
  const senderJid = msg.key?.participant || remoteJid;
  const queueKey = `${remoteJid}:${senderJid}`;
  const body =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    "";
  const isCommand = body.trimStart().startsWith(getPrefix());

  let queue = messageQueues.get(queueKey);
  if (!queue) {
    queue = {
      tail: Promise.resolve(),
      pending: 0,
      commandActive: 0,
      commandPending: [],
    };
    messageQueues.set(queueKey, queue);
  }

  const totalQueued =
    queue.pending + queue.commandActive + queue.commandPending.length;
  if (totalQueued >= MAX_PENDING_MESSAGES_PER_KEY) {
    if (isCommand) {
      void sock?.sendMessage(remoteJid, {
        text: "⏳ You have several commands still running. Please wait a moment and try again.",
      }).catch(() => {});
    }
    return;
  }

  // Commands get a small concurrent lane so one slow external API call does
  // not hold up the sender's next command. Non-command game turns remain
  // ordered through the serial lane below.
  if (isCommand) {
    queue.commandPending.push(handler);
    drainCommandQueue(queueKey, queue);
    return;
  }

  queue.pending += 1;
  const current = queue.tail
    .catch(() => {})
    .then(handler)
    .catch((err) => {
      log("error", "Plugin error: " + String(err));
    });
  queue.tail = current;

  current.finally(() => {
    queue.pending -= 1;
    cleanupMessageQueue(queueKey, queue);
  }).catch(() => {});
}

export async function connectBot(phoneNumber, prefix) {
  _prefix = getRuntimeSettings().prefix || prefix || _prefix;
  if (phoneNumber) _phoneNumber = phoneNumber.replace(/\D/g, "");

  if (!existsSync(SESSION_DIR)) mkdirSync(SESSION_DIR, { recursive: true });

  log("info", "Connecting to WhatsApp...");

  try {
    const { version, isLatest } = await fetchLatestBaileysVersion();
    log("info", `Baileys version: ${version.join(".")} ${isLatest ? "(latest)" : ""}`);

    const { state: authState, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

    sock = makeWASocket({
      version,
      auth: {
        creds: authState.creds,
        keys: makeCacheableSignalKeyStore(authState.keys, silentLogger),
      },
      printQRInTerminal: false,
      browser: ["Ubuntu", "Chrome", "20.0.04"],
      connectTimeoutMs: 60_000,
      retryRequestDelayMs: 2_000,
      logger: silentLogger,
    });

    sock.ev.on("creds.update", saveCreds);

    // ── PAIRING CODE ──────────────────────────────────────────────────────────
    if (!authState.creds.registered && _phoneNumber) {
      await delay(3_000);
      try {
        log("info", `Requesting pairing code for +${_phoneNumber} ...`);
        const code = await sock.requestPairingCode(_phoneNumber);
        showPairingCode(code, _phoneNumber);
      } catch (err) {
        log("error", "Pairing code request failed: " + String(err));
        log("warn", "QR code will be shown as fallback — scan it with WhatsApp.");
      }
    }

    // ── Connection state ──────────────────────────────────────────────────────
    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const { default: qrcode } = await import("qrcode-terminal");
          log("warn", "Pairing code unavailable — showing QR code instead:");
          qrcode.generate(qr, { small: true });
          log("info", "Scan the QR above in WhatsApp → Linked Devices → Link a Device");
        } catch {
          log("warn", "QR (raw — paste into https://qrcode-decoder.com): " + qr);
        }
      }

      if (connection === "open") {
        const jid = sock.user?.id ?? "";
        const num = jid.split(":")[0].replace("@s.whatsapp.net", "");
        log("info", `✅  Connected as +${num}`);
        log("info", "Bot is ready. Listening for messages...");

        if (heartbeatTimer) clearInterval(heartbeatTimer);
        await markBotOnline({
          botJid: jid,
          botName: BOT_NAME,
          startedAt: processStartedAt,
        }).catch((err) => log("warn", `Bot registry update failed: ${err.message}`));
        heartbeatTimer = setInterval(() => {
          heartbeatBot(jid).catch((err) => {
            log("warn", `Bot heartbeat failed: ${err.message}`);
          });
        }, BOT_HEARTBEAT_INTERVAL_MS);
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error)?.output?.statusCode;
        const loggedOut  = statusCode === DisconnectReason.loggedOut;
        log("warn", `Connection closed. Code: ${statusCode ?? "?"}. Logged out: ${loggedOut}`);

        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
        await markBotOffline(sock.user?.id).catch((err) => {
          log("warn", `Bot offline update failed: ${err.message}`);
        });
        sock = null;
        if (!loggedOut) {
          const wait = manualRestart ? 1_000 : 5_000;
          manualRestart = false;
          log("info", `Reconnecting in ${wait / 1000}s...`);
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => connectBot(null, _prefix), wait);
        } else {
          log("warn", "Session logged out. Delete sessions/auth/ and restart to re-pair.");
          process.exit(0);
        }
      }
    });

    // ── Message handling ──────────────────────────────────────────────────────
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;

      for (const msg of messages) {
        if (!msg.message) continue;
        // fromMe = owner sent message from bot device — pass as flag, don't skip
        const senderJid = msg.key.participant || msg.key.remoteJid || "";
        if (msg.key.remoteJid?.endsWith("@g.us") && senderJid && !msg.key.fromMe) {
          // Activity tracking must not wait behind a slow command.
          recordGroupActivity(msg.key.remoteJid, senderJid);
        }

        queueIncomingMessage(msg, async () => {
        try {
          const runtime = getRuntimeSettings();
          const gameText =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            msg.message?.videoMessage?.caption ||
            "";
          const commandPrefix = runtime.prefix || _prefix;
          const isCommandMessage = gameText.trimStart().startsWith(commandPrefix);
          if (await handleKordGameText({
            sock,
            msg,
            sender: senderJid,
            text: gameText,
            prefix: commandPrefix,
          })) {
            return;
          }
          const isAfkCommand = isAfkCommandMessage(msg, commandPrefix);
          const senderAfk = !isAfkCommand && !isCommandMessage
            ? getAfkUser(senderJid) || await getStoredAfk(senderJid)
            : null;
          if (senderAfk) {
            const afkData = senderAfk;
            deleteAfkUser(senderJid);
            const elapsed  = Math.floor((Date.now() - afkData.time) / 60000);
            const hrs      = Math.floor(elapsed / 60);
            const mins     = elapsed % 60;
            const timeStr  = elapsed < 1
              ? "less than a minute"
              : hrs > 0
                ? `${hrs}h ${mins}m`
                : `${mins} minute${mins === 1 ? "" : "s"}`;
            const username = afkData.username || senderJid.split("@")[0].split(":")[0];
            const tag      = senderJid.split("@")[0].split(":")[0];

            // Clear AFK from DB (fix: await getDb(), correct collection "users")
            try {
              const db = await getDb();
              await db.collection("users").updateOne(
                { _id: senderJid },
                { $set: { afk: null } }
              );
            } catch { /* DB may not be connected yet — Map clear is enough */ }

            await sock.sendMessage(msg.key.remoteJid, {
              text: [
                `╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮`,
                `┃  ✨ *お か え り な さ い* ✨  ┃`,
                `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
                `🌸 *@${tag}* is back online~`,
                `╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌`,
                `⏱ *Away for* ꔫ _${timeStr}_`,
                `╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌`,
                `_良かった~ We missed you!_ 💫`,
                `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
              ].join("\n"),
              mentions: [senderJid],
            }, { quoted: msg }).catch(() => {});
          }

          // AFK: notify if a mentioned user is AFK
          const messageContent = msg.message?.ephemeralMessage?.message
            || msg.message?.viewOnceMessage?.message
            || msg.message;
          const contextInfo = Object.values(messageContent || {})
            .find((value) => value && typeof value === "object" && value.contextInfo)?.contextInfo;
          const mentionedJids = isCommandMessage ? [] : (contextInfo?.mentionedJid ?? []);
          for (const jid of mentionedJids) {
            const afkData = getAfkUser(jid) || await getStoredAfk(jid);
            if (afkData) {
              const { reason, time, username: afkName } = afkData;
              const minAway  = Math.floor((Date.now() - time) / 60000);
              const hrs      = Math.floor(minAway / 60);
              const mins     = minAway % 60;
              const awayStr  = minAway < 1
                ? "just went AFK"
                : hrs > 0
                  ? `${hrs}h ${mins}m ago`
                  : `${mins} min${mins === 1 ? "" : "s"} ago`;
              const dispName = afkName || jid.split("@")[0].split(":")[0];
              const dispTag  = jid.split("@")[0].split(":")[0];

              await sock.sendMessage(msg.key.remoteJid, {
                text: [
                  `╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮`,
                  `┃  💤 *A F K  通 知* 💤  ┃`,
                  `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
                  `😴 *@${dispTag}* is currently away~`,
                  `╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌`,
                  `💬 *Reason* ꔫ _${reason}_`,
                  `⏱ *Away*   ꔫ _${awayStr}_`,
                  `╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌`,
                  `_They'll see your msg when back~ 🌸_`,
                  `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
                ].join("\n"),
                mentions: [jid],
              }, { quoted: msg }).catch(() => {});
            }
          }

          // Delete messages from individually muted users first
          const wasMuted = await mutedUserHandler({ sock, msg });
          if (wasMuted) return;

          // Commands should not wait for AI, quizzes, or optional moderation
          // handlers. Moderation still runs, but independently of the reply.
          if (isCommandMessage) {
            void Promise.allSettled([
              antiLinkHandler({ sock, msg }),
              antibadwordHandler({ sock, msg }),
              antispamHandler({ sock, msg }),
              antimentionHandler({ sock, msg }),
            ]);
            await routeMessage(
              sock,
              msg,
              commandPrefix,
              runtime.ownerNumber,
              msg.key.fromMe === true
            );
            return;
          }

          // Start Akira's presence update and provider request in parallel
          // with the moderation checks so typing feedback and the AI request
          // are not delayed by unrelated handlers.
          const akiraReply = akiraHandler({
            sock,
            msg,
            prefix: runtime.prefix || _prefix,
          }).catch((err) => {
            log("error", "Akira handler error: " + String(err));
          });
          await antiLinkHandler({ sock, msg });
          await antibadwordHandler({ sock, msg });
          await antispamHandler({ sock, msg });
          await antimentionHandler({ sock, msg });
          await akiraReply;
          await handleTodText(sock, msg);
          await handleAnimeQuizText(sock, msg, getUser, saveUser);
          await routeMessage(
            sock,
            msg,
            runtime.prefix || _prefix,
            runtime.ownerNumber,
            msg.key.fromMe === true
          );
        } catch (err) {
          log("error", "Plugin error: " + String(err));
        }
        });
      }
    });

    // ── Group participant events (welcome / goodbye / bot-join greeting) ──────
    sock.ev.on("group-participants.update", async (update) => {
      try {
        await handleGroupParticipants(sock, update);
      } catch (err) {
        log("error", "Group participant event error: " + String(err));
      }
    });

  } catch (err) {
    log("error", "Bot init failed: " + String(err));
    log("info", "Retrying in 10s...");
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => connectBot(null, _prefix), 10_000);
  }
}

async function getStoredAfk(jid) {
  try {
    const user = await getUser(jid);
    const afk = user?.afk;
    if (!afk?.active) return null;

    const data = {
      reason: afk.message || afk.reason || "No reason given",
      time: afk.since || Date.now(),
      username: user.name || jid.split("@")[0].split(":")[0],
    };
    return data;
  } catch {
    return null;
  }
}

function isAfkCommandMessage(msg, prefix) {
  const body =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    "";

  if (!prefix || !body.startsWith(prefix)) return false;
  const command = body.slice(prefix.length).trim().split(/\s+/, 1)[0]?.toLowerCase();
  return command === "afk" || command === "away";
}

function showPairingCode(code, number) {
  const line = "╔══════════════════════════════════════════╗";
  const mid  = "╠══════════════════════════════════════════╣";
  const end  = "╚══════════════════════════════════════════╝";
  console.log([
    "",
    line,
    "║          KELIN MD — PAIRING CODE          ║",
    mid,
    `║   Code   :  ${code.padEnd(28)} ║`,
    `║   Number : +${number.padEnd(27)} ║`,
    mid,
    "║  HOW TO PAIR:                             ║",
    "║  1. Open WhatsApp on your phone           ║",
    "║  2. Tap Settings → Linked Devices         ║",
    "║  3. Tap  Link a Device  →  OK             ║",
    "║  4. Enter the code shown above            ║",
    end,
    "",
  ].join("\n"));
}
