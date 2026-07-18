import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import path from "path";
import { existsSync, mkdirSync, rmSync } from "fs";
import { logger } from "./logger";
import { botLog } from "./logBuffer";
import { getSettings } from "./settingsManager";

const WORKSPACE_ROOT = path.resolve(process.cwd(), "../..");

export type BotConnectionStatus =
  | "connected"
  | "disconnected"
  | "connecting"
  | "pairing";

interface BotState {
  status: BotConnectionStatus;
  socket: WASocket | null;
  connectedNumber: string | null;
  connectedAt: Date | null;
  pairingCode: string | null;
  pairingPhone: string | null;
  startedAt: Date;
  totalUsers: number;
  totalGroups: number;
}

const state: BotState = {
  status: "disconnected",
  socket: null,
  connectedNumber: null,
  connectedAt: null,
  pairingCode: null,
  pairingPhone: null,
  startedAt: new Date(),
  totalUsers: 0,
  totalGroups: 0,
};

let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

function getSessionDir(): string {
  const settings = getSettings();
  return path.join(WORKSPACE_ROOT, settings.sessionFolder ?? "sessions", "auth");
}

export async function connectBot(phoneNumber?: string): Promise<string | null> {
  if (state.status === "connecting" || state.status === "pairing") {
    botLog("warn", "Bot connection already in progress");
    return null;
  }

  const sessionDir = getSessionDir();
  if (!existsSync(sessionDir)) mkdirSync(sessionDir, { recursive: true });

  state.status = "connecting";
  state.pairingCode = null;
  botLog("info", "Initializing WhatsApp connection...");

  try {
    const { version } = await fetchLatestBaileysVersion();
    const { state: authState, saveCreds } = await useMultiFileAuthState(sessionDir);

    const sock: WASocket = makeWASocket({
      version,
      auth: {
        creds: authState.creds,
        keys: makeCacheableSignalKeyStore(authState.keys, logger as any),
      },
      printQRInTerminal: false,
      browser: ["KELIN MD", "Chrome", "120.0.0"],
      connectTimeoutMs: 60_000,
      retryRequestDelayMs: 2_000,
      logger: logger as any,
    });

    state.socket = sock;

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr && phoneNumber) {
        // Use pairing code instead of QR
        state.status = "pairing";
        try {
          const cleanNumber = phoneNumber.replace(/[^0-9]/g, "");
          const code = await sock.requestPairingCode(cleanNumber);
          state.pairingCode = code;
          state.pairingPhone = phoneNumber;
          botLog("info", `Pairing code generated for ${phoneNumber}: ${code}`);
          logger.info({ code }, "Pairing code generated");
        } catch (err) {
          botLog("error", "Failed to generate pairing code", String(err));
          logger.error({ err }, "Failed to generate pairing code");
        }
      }

      if (connection === "open") {
        state.status = "connected";
        state.pairingCode = null;
        state.connectedAt = new Date();
        const jid = sock.user?.id ?? null;
        state.connectedNumber = jid
          ? jid.split(":")[0].replace("@s.whatsapp.net", "")
          : null;
        botLog("info", `Connected as ${state.connectedNumber ?? "unknown"}`);
        logger.info({ number: state.connectedNumber }, "WhatsApp connected");

        // Count groups and contacts
        try {
          const chats = await sock.groupFetchAllParticipating();
          state.totalGroups = Object.keys(chats).length;
        } catch {
          // ignore
        }
      }

      if (connection === "close") {
        const err = lastDisconnect?.error as Boom | undefined;
        const code = err?.output?.statusCode;
        const shouldReconnect = code !== DisconnectReason.loggedOut;

        botLog(
          "warn",
          `Connection closed. Code: ${code ?? "unknown"}. Reconnect: ${shouldReconnect}`
        );
        logger.warn({ code, shouldReconnect }, "WhatsApp connection closed");

        state.status = "disconnected";
        state.socket = null;
        state.connectedNumber = null;

        if (shouldReconnect) {
          const delay = 5_000;
          botLog("info", `Reconnecting in ${delay / 1000}s...`);
          if (reconnectTimeout) clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(() => {
            connectBot().catch((e) =>
              logger.error({ err: e }, "Reconnect failed")
            );
          }, delay);
        } else {
          botLog("warn", "Logged out. Session cleared.");
        }
      }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;
      for (const msg of messages) {
        if (!msg.message) continue;
        state.totalUsers = Math.max(state.totalUsers, state.totalUsers);
        // Plugin message routing happens here via pluginManager
        try {
          const { routeMessage } = await import("./pluginManager.js");
          await routeMessage(sock, msg);
        } catch (e) {
          logger.error({ err: e }, "Plugin routing error");
        }
      }
    });

    sock.ev.on("groups.update", (updates) => {
      logger.debug({ count: updates.length }, "Groups updated");
    });

    return null;
  } catch (err) {
    state.status = "disconnected";
    botLog("error", "Failed to initialize bot", String(err));
    logger.error({ err }, "Bot initialization failed");
    return null;
  }
}

export async function requestPairingCode(phoneNumber: string): Promise<string> {
  if (state.status === "connected") {
    throw new Error("Already connected. Logout first.");
  }
  // Start fresh connection with pairing
  await connectBot(phoneNumber);

  // Wait up to 30s for pairing code
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    if (state.pairingCode) return state.pairingCode;
    if (state.status === "connected") throw new Error("Connected without pairing");
  }
  throw new Error("Pairing code not received. Please try again.");
}

export async function logoutBot(): Promise<void> {
  if (state.socket) {
    try {
      await state.socket.logout();
    } catch {
      // ignore
    }
    state.socket = null;
  }
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  // Clear session files
  const sessionDir = getSessionDir();
  if (existsSync(sessionDir)) {
    rmSync(sessionDir, { recursive: true, force: true });
    mkdirSync(sessionDir, { recursive: true });
  }

  state.status = "disconnected";
  state.connectedNumber = null;
  state.connectedAt = null;
  state.pairingCode = null;
  botLog("info", "Logged out and session cleared");
}

export async function restartBot(): Promise<void> {
  botLog("info", "Restarting bot...");
  if (state.socket) {
    try {
      await state.socket.end(undefined);
    } catch {
      // ignore
    }
    state.socket = null;
  }
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  state.status = "disconnected";
  setTimeout(() => connectBot().catch(logger.error), 1000);
}

export function getBotState(): BotState {
  return { ...state };
}

export function getSocket(): WASocket | null {
  return state.socket;
}

export function hasSession(): boolean {
  const sessionDir = getSessionDir();
  return existsSync(path.join(sessionDir, "creds.json"));
}
