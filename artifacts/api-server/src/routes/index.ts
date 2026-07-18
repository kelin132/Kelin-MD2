import { Router } from "express";
import healthRouter from "./health.js";
import botRouter from "./bot.js";
import pluginsRouter from "./plugins.js";
import commandsRouter from "./commands.js";
import logsRouter from "./logs.js";
import filesRouter from "./files.js";
import settingsRouter from "./settings.js";
import backupRouter from "./backup.js";

const router = Router();

router.use(healthRouter);
router.use(botRouter);
router.use(pluginsRouter);
router.use(commandsRouter);
router.use(logsRouter);
router.use(filesRouter);
router.use(settingsRouter);
router.use(backupRouter);

export default router;
