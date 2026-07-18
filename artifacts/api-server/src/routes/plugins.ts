import { Router, type IRouter } from "express";
import {
  getPlugins,
  reloadPlugins,
  togglePlugin,
} from "../lib/pluginManager.js";
import {
  ListPluginsResponse,
  TogglePluginBody,
  TogglePluginParams,
  ReloadPluginsResponse,
  TogglePluginResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/plugins", async (_req, res): Promise<void> => {
  const plugins = getPlugins();
  res.json(ListPluginsResponse.parse(plugins));
});

router.post("/plugins/reload", async (_req, res): Promise<void> => {
  await reloadPlugins();
  res.json(ReloadPluginsResponse.parse({ success: true, message: "Plugins reloaded successfully" }));
});

router.patch("/plugins/:pluginId/toggle", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.pluginId)
    ? req.params.pluginId[0]
    : req.params.pluginId;

  const bodyParsed = TogglePluginBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }

  // Decode URL-encoded plugin ID (e.g. main%2Fping → main/ping)
  const pluginId = decodeURIComponent(rawId);
  const plugin = togglePlugin(pluginId, bodyParsed.data.enabled);
  if (!plugin) {
    res.status(404).json({ error: `Plugin not found: ${pluginId}` });
    return;
  }

  res.json(TogglePluginResponse.parse(plugin));
});

export default router;
