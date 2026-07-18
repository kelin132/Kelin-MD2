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
import { existsSync, mkdirSync } from "fs";
import { log } from "./logger.mjs";
import { routeMessage } from "./pluginManager.mjs";
import pino from "pino";

const SESSION_DIR = path.resolve("sessions", "auth");
const OWNER_NUMBER = process.env.OWNER_NUMBER || "";

// Silent Baileys-internal logger (errors only)
const silentLogger = pino({ level: "silent" });

let sock = null;
let reconnectTimer = null;
let _prefix = ".";
let _phoneNumber = null;       // stored so reconnects can re-request pairing
let _pairingDone = false;      // prevent duplicate pairing code requests

export function hasSession() {
  return existsSync(path.join(SESSION_DIR, "creds.json"));
}

export function getSocket() {
  return sock;
}

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
      // Use a generic browser fingerprint — avoids pairing-code rejections
      browser: ["Ubuntu", "Chrome", "20.0.04"],
      connectTimeoutMs: 60_000,
      retryRequestDelayMs: 2_000,
      logger: silentLogger,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // QR event fires when WhatsApp wants us to scan — we intercept and use
      // pairing code instead. Guard with _pairingDone so we only ask once.
      if (qr && _phoneNumber && !_pairingDone) {
        _pairingDone = true;
        // Small delay lets the WS handshake fully settle before the API call
        setTimeout(async () => {
          try {
            log("info", `Requesting pairing code for +${_phoneNumber} ...`);
            const code = await sock.requestPairingCode(_phoneNumber);
            showPairingCode(code, _phoneNumber);
          } catch (err) {
            log("error", "Failed to get pairing code: " + String(err));
            log("warn", "Retrying pairing code in 5 s...");
            _pairingDone = false; // allow retry on next QR event
          }
        }, 3_000);
      }

      if (connection === "open") {
        _pairingDone = true; // session is live — never re-request
        const jid = sock.user?.id ?? "";
        const num = jid.split(":")[0].replace("@s.whatsapp.net", "");
        log("info", `✅  Connected as +${num}`);
        log("info", "Bot is ready. Listening for messages...");
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error)?.output?.statusCode;
        const loggedOut  = statusCode === DisconnectReason.loggedOut;
        log("warn", `Connection closed. Code: ${statusCode ?? "?"}. Logged out: ${loggedOut}`);

        sock = null;
        if (!loggedOut) {
          const delay = 5_000;
          log("info", `Reconnecting in ${delay / 1000}s...`);
          if (reconnectTimer) clearTimeout(reconnectTimer);
          // Reset pairing flag so reconnect can pair again if still no session
          if (!hasSession()) _pairingDone = false;
          reconnectTimer = setTimeout(() => connectBot(null, _prefix), delay);
        } else {
          log("warn", "Session logged out. Delete sessions/auth/ and restart to re-pair.");
          process.exit(0);
        }
      }
    });

    // Route incoming messages through plugins
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;
      for (const msg of messages) {
        if (!msg.message) continue;
        try {
          await routeMessage(sock, msg, _prefix, OWNER_NUMBER);
        } catch (err) {
          log("error", "Plugin error: " + String(err));
        }
      }
    });

  } catch (err) {
    log("error", "Bot init failed: " + String(err));
    log("info", "Retrying in 10s...");
    setTimeout(() => connectBot(null, _prefix), 10_000);
  }
}

function showPairingCode(code, number) {
  const banner = [
    "",
    "╔══════════════════════════════════════════╗",
    "║          KELIN MD — PAIRING CODE          ║",
    "╠══════════════════════════════════════════╣",
    `║   Code   :  ${code.padEnd(28)} ║`,
    `║   Number : +${number.padEnd(27)} ║`,
    "╠══════════════════════════════════════════╣",
    "║  HOW TO PAIR:                             ║",
    "║  1. Open WhatsApp on your phone           ║",
    "║  2. Tap Settings → Linked Devices         ║",
    "║  3. Tap  Link a Device  →  OK             ║",
    "║  4. Enter the code shown above            ║",
    "╚══════════════════════════════════════════╝",
    "",
  ];
  console.log(banner.join("\n"));
}
