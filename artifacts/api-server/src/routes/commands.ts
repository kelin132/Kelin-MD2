import { Router, type IRouter } from "express";
import { getCommands } from "../lib/pluginManager.js";
import { ListCommandsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/commands", async (_req, res): Promise<void> => {
  const commands = getCommands().map((c) => ({
    name: c.name,
    description: c.description ?? "",
    category: c.category ?? "utilities",
    usage: c.usage ?? `.${c.name}`,
    aliases: c.aliases ?? [],
    cooldown: c.cooldown ?? 3,
    isOwner: c.isOwner ?? false,
    isAdmin: c.isAdmin ?? false,
    isPremium: c.isPremium ?? false,
  }));
  res.json(ListCommandsResponse.parse(commands));
});

export default router;
