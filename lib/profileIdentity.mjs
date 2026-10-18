import { normalizeJid, resolveAndMigrateIdentity } from "./identity.mjs";

/**
 * Resolve a mention, quoted participant, or typed user ID before it is used
 * as an account or persistence key. The sender has already been canonicalized
 * by command routing, so preserve that value when the target is the same user.
 */
export async function resolveTargetIdentity(
  rawTarget,
  { sender = "", sock, chatId = "", database = null } = {},
) {
  if (!rawTarget) return "";

  const target = String(rawTarget);
  if (sender && normalizeJid(target) === normalizeJid(sender)) {
    return normalizeJid(sender);
  }

  return resolveAndMigrateIdentity(target, sock, chatId, "", database);
}

export async function resolveProfileTarget({
  mentionedJid = "",
  quotedParticipant = "",
  sender = "",
  sock,
  chatId = "",
  database = null,
} = {}) {
  const rawTarget = mentionedJid || quotedParticipant || sender;
  if (!rawTarget) return "";

  return resolveTargetIdentity(rawTarget, { sender, sock, chatId, database });
}
