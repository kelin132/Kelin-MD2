import { normalizeJid, resolveAndMigrateIdentity } from "../identity.mjs";

export async function resolveChallengeTarget({ jid, sock, chatJid }) {
  const raw = String(jid || "").trim();
  if (!raw) return null;
  if (raw.startsWith("discord:")) return raw;
  const resolved = raw.endsWith("@lid")
    ? await resolveAndMigrateIdentity(raw, sock, chatJid)
    : normalizeJid(raw);
  return resolved.endsWith("@s.whatsapp.net") || resolved.endsWith("@lid")
    ? resolved
    : null;
}

export function challengeMentionJid(rawJid, resolvedJid) {
  return String(rawJid || "").startsWith("discord:") ? rawJid : resolvedJid;
}
