import { Router, type IRouter } from "express";
import { getSettings, updateSettings } from "../lib/settingsManager.js";
import { GetSettingsResponse, UpdateSettingsBody, UpdateSettingsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/settings", async (_req, res): Promise<void> => {
  const settings = getSettings();
  res.json(GetSettingsResponse.parse(settings));
});

router.put("/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updated = updateSettings(parsed.data as any);
  res.json(UpdateSettingsResponse.parse(updated));
});

export default router;
