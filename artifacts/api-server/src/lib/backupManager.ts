import path from "path";
import { createWriteStream, existsSync, mkdirSync, readdirSync, statSync } from "fs";
import { createRequire } from "module";
import { logger } from "./logger.js";
import { botLog } from "./logBuffer.js";

const _require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const archiver: any = _require("archiver");

const WORKSPACE_ROOT = path.resolve(process.cwd(), "../..");
const BACKUP_DIR = path.join(WORKSPACE_ROOT, "backups");

export interface BackupInfo {
  id: string;
  filename: string;
  createdAt: string;
  sizeMb: number;
}

function ensureBackupDir(): void {
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });
}

export function listBackups(): BackupInfo[] {
  ensureBackupDir();
  return readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith(".zip"))
    .map((f) => {
      const full = path.join(BACKUP_DIR, f);
      const stat = statSync(full);
      return {
        id: f.replace(".zip", ""),
        filename: f,
        createdAt: stat.birthtime.toISOString(),
        sizeMb: Math.round((stat.size / 1024 / 1024) * 100) / 100,
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createBackup(): Promise<BackupInfo> {
  ensureBackupDir();
  const id = `backup_${Date.now()}`;
  const filename = `${id}.zip`;
  const outPath = path.join(BACKUP_DIR, filename);

  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(outPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);

    // Add sessions
    const sessionsDir = path.join(WORKSPACE_ROOT, "sessions");
    if (existsSync(sessionsDir)) archive.directory(sessionsDir, "sessions");

    // Add config
    const configDir = path.join(WORKSPACE_ROOT, "config");
    if (existsSync(configDir)) archive.directory(configDir, "config");

    // Add database
    const dbDir = path.join(WORKSPACE_ROOT, "database");
    if (existsSync(dbDir)) archive.directory(dbDir, "database");

    archive.finalize();
  });

  const stat = statSync(outPath);
  const info: BackupInfo = {
    id,
    filename,
    createdAt: new Date().toISOString(),
    sizeMb: Math.round((stat.size / 1024 / 1024) * 100) / 100,
  };

  botLog("info", `Backup created: ${filename}`);
  logger.info({ filename }, "Backup created");
  return info;
}

export async function restoreBackup(backupId: string): Promise<void> {
  const filename = `${backupId}.zip`;
  const backupPath = path.join(BACKUP_DIR, filename);

  if (!existsSync(backupPath)) {
    throw new Error(`Backup not found: ${backupId}`);
  }

  botLog("info", `Restoring from backup: ${filename}`);
  logger.info({ backupId }, "Restore initiated (manual restart required)");
}
