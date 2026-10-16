import { resolveAndMigrateIdentity } from "./identity.mjs";

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

  // The current sender already passed through message routing. Avoid repeating
  // that work for the common self-profile path.
  if (rawTarget === sender) return String(sender);

  return resolveAndMigrateIdentity(
    String(rawTarget),
    sock,
    chatId,
    "",
    database,
  );
}
