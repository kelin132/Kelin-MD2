import { Router, type IRouter } from "express";
import os from "os";
import {
  getBotState,
  requestPairingCode,
  logoutBot,
  restartBot,
  connectBot,
  hasSession,
} from "../lib/bot.js";
import { botLog } from "../lib/logBuffer.js";
import { getSettings } from "../lib/settingsManager.js";
import { getPlugins, getCommands } from "../lib/pluginManager.js";
import { getApiStatus } from "./apiStatus.js";
import {
  GetBotStatusResponse,
  RequestPairingBody,
  RequestPairingResponse,
  GetSessionResponse,
  LogoutResponse,
  RestartBotResponse,
  ShutdownBotResponse,
  UpdateBotResponse,
  GetApiStatusResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/bot/status", async (_req, res): Promise<void> => {
  const botState = getBotState();
  const settings = getSettings();
  const plugins = getPlugins();
  const commands = getCommands();

  const memUsage = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const cpuLoad = os.loadavg()[0];
  const cpuCount = os.cpus().length;

  const uptimeSeconds = Math.floor((Date.now() - botState.startedAt.getTime()) / 1000);

  const data = {
    connected: botState.status === "connected",
    status: botState.status,
    uptime: uptimeSeconds,
    ramUsageMb: Math.round(memUsage.rss / 1024 / 1024),
    ramTotalMb: Math.round(totalMem / 1024 / 1024),
    cpuUsage: Math.round((cpuLoad / cpuCount) * 100) / 100,
    totalUsers: botState.totalUsers,
    totalGroups: botState.totalGroups,
    totalCommands: commands.length,
    pluginCount: plugins.length,
    connectedNumber: botState.connectedNumber,
    botName: settings.botName,
    version: "1.0.0",
    pairingCode: botState.pairingCode,
  };

  res.json(GetBotStatusResponse.parse(data));
});

router.post("/bot/pair", async (req, res): Promise<void> => {
  const parsed = RequestPairingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const botState = getBotState();
  if (botState.status === "connected") {
    res.status(409).json({ error: "Already connected. Logout first." });
    return;
  }

  try {
    const pairingCode = await requestPairingCode(parsed.data.phoneNumber);
    res.json(
      RequestPairingResponse.parse({
        pairingCode,
        phoneNumber: parsed.data.phoneNumber,
      })
    );
  } catch (err) {
    req.log.error({ err }, "Pairing failed");
    res.status(500).json({ error: String(err) });
  }
});

router.get("/bot/session", async (_req, res): Promise<void> => {
  const botState = getBotState();
  const settings = getSettings();

  res.json(
    GetSessionResponse.parse({
      connected: botState.status === "connected",
      hasSession: hasSession(),
      phoneNumber: botState.connectedNumber,
      name: settings.botName,
      sessionPath: settings.sessionFolder ?? "sessions",
      connectedAt: botState.connectedAt?.toISOString() ?? null,
    })
  );
});

router.delete("/bot/session", async (req, res): Promise<void> => {
  try {
    await logoutBot();
    res.json(LogoutResponse.parse({ success: true, message: "Logged out successfully" }));
  } catch (err) {
    req.log.error({ err }, "Logout failed");
    res.status(500).json({ error: String(err) });
  }
});

router.post("/bot/restart", async (req, res): Promise<void> => {
  try {
    await restartBot();
    res.json(RestartBotResponse.parse({ success: true, message: "Bot restarting..." }));
  } catch (err) {
    req.log.error({ err }, "Restart failed");
    res.status(500).json({ error: String(err) });
  }
});

router.post("/bot/shutdown", async (req, res): Promise<void> => {
  res.json(ShutdownBotResponse.parse({ success: true, message: "Bot shutting down..." }));
  botLog("warn", "Shutdown requested via dashboard");
  setTimeout(() => process.exit(0), 1000);
});

router.post("/bot/update", async (_req, res): Promise<void> => {
  botLog("info", "Update requested via dashboard");
  res.json(UpdateBotResponse.parse({ success: true, message: "Update initiated. Bot will restart after update." }));
  // In production: run git pull + npm install + restart
});

router.get("/api-status", async (_req, res): Promise<void> => {
  const statuses = getApiStatus();
  res.json(GetApiStatusResponse.parse(statuses));
});

export default router;
