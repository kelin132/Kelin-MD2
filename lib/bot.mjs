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
import { routeMessage, afkUsers } from "./pluginManager.mjs";
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
import { akiraHandler } from "./akiraHandler.mjs";
import { handleTodText } from "./todGame.mjs";
import { handleAnimeQuizText } from "./animeQuizGame.mjs";
import { getUser, saveUser } from "../plugins/economy/database.js";
import { handleGroupParticipants } from "./groupEventHandler.mjs";
import { createRequire } from "module";
import pino from "pino";

// settings.js is CommonJS — import via createRequire for ESM compatibility
const _require  = createRequire(import.meta.url);
const _settings = _require("../settings.cjs");

const SESSION_DIR = path.resolve("sessions", "auth");
const BOT_NAME = process.env.BOT_NAME || _settings.botName || "KELIN MD";
// Owner number priority: OWNER_NUMBER env var → settings.js → (never BOT_NUMBER)
const OWNER_NUMBER = (process.env.OWNER_NUMBER || _settings.ownerNumber || "").replace(/\D/g, "");

// Silent Baileys-internal logger
const silentLogger = pino({ level: "silent" });

let sock           = null;
let reconnectTimer = null;
let heartbeatTimer = null;
const processStartedAt = new Date();
let _prefix        = ".";
let _phoneNumber   = null; // persisted across reconnects

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

export function getPrefix() { return _prefix; }

export function getSocket() {
  return sock;
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export async function connectBot(phoneNumber, prefix) {
  if (prefix) _prefix = prefix;
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
          const wait = 5_000;
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

        try {
          // AFK: auto-unmark if AFK sender sends any message
          const senderJid = msg.key.participant || msg.key.remoteJid || "";
          if (afkUsers.has(senderJid)) {
            const afkData = afkUsers.get(senderJid);
            afkUsers.delete(senderJid);
            const elapsed = Math.floor((Date.now() - afkData.time) / 60000);

            // Clear AFK from DB as well (economy/afk.js stores it there)
            try {
              const db = getDb();
              await db.collection("users").updateOne(
                { _id: senderJid },
                { $set: { afk: null } }
              );
            } catch { /* DB may not be connected yet — Map clear is enough */ }

            await sock.sendMessage(msg.key.remoteJid, {
              text: `✅ @${senderJid.split("@")[0]} is no longer AFK!\n⏱ Away for ${elapsed < 1 ? "less than a minute" : `${elapsed} minute(s)`}`,
              mentions: [senderJid],
            }, { quoted: msg }).catch(() => {});
          }

          // AFK: notify if a mentioned user is AFK
          const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
          for (const jid of mentionedJids) {
            if (afkUsers.has(jid)) {
              const { reason } = afkUsers.get(jid);
              await sock.sendMessage(msg.key.remoteJid, {
                text: `😴 @${jid.split("@")[0]} is currently AFK\nReason: _${reason}_`,
                mentions: [jid],
              }, { quoted: msg }).catch(() => {});
            }
          }

          await antiLinkHandler({ sock, msg });
          await antibadwordHandler({ sock, msg });
          await antispamHandler({ sock, msg });
          await akiraHandler({ sock, msg, prefix: _prefix });
          await handleTodText(sock, msg);
          await handleAnimeQuizText(sock, msg, getUser, saveUser);
          await routeMessage(sock, msg, _prefix, OWNER_NUMBER, msg.key.fromMe === true);
        } catch (err) {
          log("error", "Plugin error: " + String(err));
        }
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
