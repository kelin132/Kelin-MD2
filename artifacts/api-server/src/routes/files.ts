import { Router, type IRouter } from "express";
import path from "path";
import { readdirSync, statSync, readFileSync, existsSync } from "fs";
import { ListFilesQueryParams, ListFilesResponse, GetFileContentQueryParams, GetFileContentResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const WORKSPACE_ROOT = path.resolve(process.cwd(), "../..");

// Allowed base directories for security
const ALLOWED_DIRS = ["plugins", "config", "database", "logs", "sessions"];

function resolveSafePath(requestedPath: string): string | null {
  const cleaned = requestedPath.replace(/\.\./g, "").replace(/^\//, "");
  const resolved = path.resolve(WORKSPACE_ROOT, cleaned);
  // Ensure the resolved path is within workspace
  if (!resolved.startsWith(WORKSPACE_ROOT)) return null;
  return resolved;
}

function isAllowedPath(resolvedPath: string): boolean {
  const rel = path.relative(WORKSPACE_ROOT, resolvedPath);
  const topDir = rel.split(path.sep)[0];
  return ALLOWED_DIRS.includes(topDir ?? "") || rel === ".";
}

router.get("/files", async (req, res): Promise<void> => {
  const params = ListFilesQueryParams.safeParse(req.query);
  const requestedPath = params.success ? (params.data.path ?? ".") : ".";

  const resolved = resolveSafePath(requestedPath);
  if (!resolved || !isAllowedPath(resolved)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  if (!existsSync(resolved)) {
    res.json([]);
    return;
  }

  try {
    const entries = readdirSync(resolved).map((name) => {
      const full = path.join(resolved, name);
      const stat = statSync(full);
      return {
        name,
        path: path.relative(WORKSPACE_ROOT, full).replace(/\\/g, "/"),
        type: stat.isDirectory() ? ("directory" as const) : ("file" as const),
        size: stat.size,
        modified: stat.mtime.toISOString(),
      };
    });
    res.json(ListFilesResponse.parse(entries));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/files/content", async (req, res): Promise<void> => {
  const params = GetFileContentQueryParams.safeParse(req.query);
  if (!params.success || !params.data.path) {
    res.status(400).json({ error: "path query param required" });
    return;
  }

  const resolved = resolveSafePath(params.data.path);
  if (!resolved || !isAllowedPath(resolved)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  if (!existsSync(resolved)) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  try {
    const stat = statSync(resolved);
    if (stat.isDirectory()) {
      res.status(400).json({ error: "Path is a directory" });
      return;
    }
    // Limit file size to 500KB
    if (stat.size > 512_000) {
      res.status(400).json({ error: "File too large to preview (max 500KB)" });
      return;
    }
    const content = readFileSync(resolved, "utf-8");
    res.json(
      GetFileContentResponse.parse({
        path: params.data.path,
        content,
        size: stat.size,
      })
    );
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
