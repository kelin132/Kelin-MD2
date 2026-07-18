import { Router, type IRouter } from "express";
import { getLogs, clearLogs } from "../lib/logBuffer.js";
import { GetLogsQueryParams, GetLogsResponse, ClearLogsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/logs", async (req, res): Promise<void> => {
  const params = GetLogsQueryParams.safeParse(req.query);
  const level = params.success ? params.data.level : undefined;
  const limit = params.success ? (params.data.limit ?? 100) : 100;
  const logs = getLogs(level, limit);
  res.json(GetLogsResponse.parse(logs));
});

router.post("/logs/clear", async (_req, res): Promise<void> => {
  clearLogs();
  res.json(ClearLogsResponse.parse({ success: true, message: "Logs cleared" }));
});

export default router;
