import { Router, type IRouter } from "express";
import { listBackups, createBackup, restoreBackup } from "../lib/backupManager.js";
import {
  CreateBackupResponse,
  ListBackupsResponse,
  RestoreBackupBody,
  RestoreBackupResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/backup", async (req, res): Promise<void> => {
  try {
    const info = await createBackup();
    res.json(CreateBackupResponse.parse(info));
  } catch (err) {
    req.log.error({ err }, "Backup failed");
    res.status(500).json({ error: String(err) });
  }
});

router.get("/backups", async (_req, res): Promise<void> => {
  const backups = listBackups();
  res.json(ListBackupsResponse.parse(backups));
});

router.post("/restore", async (req, res): Promise<void> => {
  const parsed = RestoreBackupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    await restoreBackup(parsed.data.backupId);
    res.json(
      RestoreBackupResponse.parse({
        success: true,
        message: "Restore initiated. Restart the bot to apply.",
      })
    );
  } catch (err) {
    const message = String(err);
    if (message.includes("not found")) {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

export default router;
