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
import { routeMessage } from "./pluginManager.mjs";
import pino from "pino";

const SESSION_DIR = path.resolve("sessions", "auth");
const OWNER_NUMBER = process.env.OWNER_NUMBER || "";

// Silent Baileys-internal logger
const silentLogger = pino({ level: "silent" });

let sock = null;
let reconnectTimer = null;
let _prefix = ".";
let _phoneNumber = null; // persisted across reconnects

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

export function getSocket() {
  return sock;
}

/** Small promise-based delay */
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
      printQRInTerminal: false, // we handle QR ourselves
      browser: ["Ubuntu", "Chrome", "20.0.04"],
      connectTimeoutMs: 60_000,
      retryRequestDelayMs: 2_000,
      logger: silentLogger,
    });

    sock.ev.on("creds.update", saveCreds);

    // ── PAIRING CODE — called immediately after socket creation ──────────────
    // This is the correct Baileys pattern. Do NOT wait for the qr event.
    // Check authState.creds.registered (not hasSession()) to avoid a file read race.
    if (!authState.creds.registered && _phoneNumber) {
      // Give the WebSocket ~3 s to complete its handshake before requesting
      await delay(3_000);
      try {
        log("info", `Requesting pairing code for +${_phoneNumber} ...`);
        const code = await sock.requestPairingCode(_phoneNumber);
        showPairingCode(code, _phoneNumber);
      } catch (err) {
        log("error", "Pairing code request failed: " + String(err));
        log("warn",  "The QR code will be shown below as a fallback — scan it with WhatsApp.");
      }
    }

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // QR fallback: if pairing code failed/timed out, display QR in terminal
      if (qr) {
        try {
          const { default: qrcode } = await import("qrcode-terminal");
          log("warn", "Pairing code unavailable — showing QR code instead:");
          qrcode.generate(qr, { small: true });
          log("info", "Scan the QR above in WhatsApp → Linked Devices → Link a Device");
        } catch {
          // qrcode-terminal not installed; print raw string as last resort
          log("warn", "QR (raw — paste into https://qrcode-decoder.com): " + qr);
        }
      }

      if (connection === "open") {
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
