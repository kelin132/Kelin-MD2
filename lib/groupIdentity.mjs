// Transport identities are not database account IDs. Keep their domains.
export function personalJid(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^\+?(\d+)(?::\d+)?(?:@(s\.whatsapp\.net|c\.us|lid))?$/i);
  if (!match) return "";
  return `${match[1]}@${match[2]?.toLowerCase() === "lid" ? "lid" : "s.whatsapp.net"}`;
}

export function participantIds(participant) {
  return [...new Set(["id", "jid", "lid", "phoneNumber"]
    .map(field => personalJid(participant?.[field])).filter(Boolean))];
}

export function participantIsAdmin(participant) {
  return [true, "admin", "superadmin"].includes(participant?.admin);
}

export function findGroupParticipant(metadata, identities) {
  const ids = new Set(identities.map(personalJid).filter(Boolean));
  return (metadata?.participants || []).find(p => participantIds(p).some(id => ids.has(id))) || null;
}

export async function resolveGroupParticipant(sock, metadata, identities) {
  const exact = findGroupParticipant(metadata, identities);
  if (exact) return exact;
  const ids = identities.map(personalJid).filter(Boolean);
  for (const id of [...ids]) {
    try {
      const mapping = sock.signalRepository?.lidMapping;
      const alternate = id.endsWith("@lid")
        ? await mapping?.getPNForLID?.(id)
        : await mapping?.getLIDForPN?.(id);
      if (personalJid(alternate)) ids.push(personalJid(alternate));
    } catch { /* Try the next identity; never grant permissions on failure. */ }
  }
  return findGroupParticipant(metadata, ids);
}

export async function groupRoles(sock, metadata, sender, alternate = "") {
  const [member, bot] = await Promise.all([
    resolveGroupParticipant(sock, metadata, [sender, alternate]),
    resolveGroupParticipant(sock, metadata, [sock.user?.id, sock.user?.jid, sock.user?.lid]),
  ]);
  return { member, bot, senderIsAdmin: participantIsAdmin(member), botIsAdmin: participantIsAdmin(bot),
    isSelf: !!member && member === bot };
}
