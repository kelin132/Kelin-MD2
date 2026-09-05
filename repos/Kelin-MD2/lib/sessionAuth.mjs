import {
  existsSync,
  lstatSync,
  mkdirSync,
  readlinkSync,
  symlinkSync,
  unlinkSync,
} from "fs";
import path from "path";

const ACTIVE_CREDENTIAL = "cred.json";
const BAILEYS_CREDENTIAL = "creds.json";

function isRegularFile(filePath) {
  try {
    return lstatSync(filePath).isFile();
  } catch {
    return false;
  }
}

function isAliasTo(linkPath, targetPath) {
  try {
    if (!lstatSync(linkPath).isSymbolicLink()) return false;
    return path.resolve(path.dirname(linkPath), readlinkSync(linkPath)) === targetPath;
  } catch {
    return false;
  }
}

/**
 * Treat cred.json as the user-facing active file while preserving Baileys'
 * required creds.json path through a symlink.
 */
export function inspectSessionCredentials(sessionDir) {
  const activePath = path.join(sessionDir, ACTIVE_CREDENTIAL);
  const baileysPath = path.join(sessionDir, BAILEYS_CREDENTIAL);
  const activeFile = isRegularFile(activePath);
  const baileysFile = isRegularFile(baileysPath);
  const baileysAlias = activeFile && isAliasTo(baileysPath, activePath);
  const activeAlias = baileysFile && isAliasTo(activePath, baileysPath);

  const files = [];
  if (activeFile && !activeAlias) files.push(activePath);
  if (baileysFile && !baileysAlias) files.push(baileysPath);

  return {
    activePath,
    baileysPath,
    files,
    count: files.length,
    filePath: files[0] || null,
    usesActiveName: files[0] === activePath,
  };
}

export function hasUsableSessionCredentials(sessionDir) {
  return inspectSessionCredentials(sessionDir).count === 1;
}

export function ensureBaileysCredentialFile(sessionDir) {
  mkdirSync(sessionDir, { recursive: true });

  // Remove only a broken alias created for this compatibility bridge. Never
  // remove a regular credential file.
  if (lstatSyncSafe(path.join(sessionDir, BAILEYS_CREDENTIAL))?.isSymbolicLink() &&
      !existsSync(path.join(sessionDir, BAILEYS_CREDENTIAL))) {
    unlinkSync(path.join(sessionDir, BAILEYS_CREDENTIAL));
  }

  const state = inspectSessionCredentials(sessionDir);
  if (state.count > 1) {
    throw new Error(
      `expected exactly one ${ACTIVE_CREDENTIAL} or ${BAILEYS_CREDENTIAL} in ${sessionDir}`,
    );
  }

  if (state.usesActiveName && !existsSync(state.baileysPath)) {
    symlinkSync(ACTIVE_CREDENTIAL, state.baileysPath);
  }

  return state.filePath;
}

function lstatSyncSafe(filePath) {
  try {
    return lstatSync(filePath);
  } catch {
    return null;
  }
}