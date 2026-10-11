const PHONE_MIN_DIGITS = 7;
const PHONE_MAX_DIGITS = 15;

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

/**
 * Return a normalized WhatsApp phone JID or privacy LID.
 *
 * Legacy lottery tickets stored only the local part of a JID. E.164 phone
 * numbers are limited to 15 digits, so longer numeric legacy IDs are kept as
 * LIDs rather than being presented or credited as fabricated phone numbers.
 */
export function getWhatsAppParticipantId(rawSender) {
  const raw = String(rawSender || "").trim();
  if (!raw || raw.startsWith("discord:")) return null;

  const parts = raw.split("@");
  if (parts.length > 2) return null;

  if (parts.length === 2) {
    const [rawLocal, rawServer] = parts;
    const local = rawLocal.split(":")[0];
    if (!/^\d+$/.test(local)) return null;

    const server = rawServer.toLowerCase();
    if (server === "lid") return `${local}@lid`;
    if (server !== "s.whatsapp.net" && server !== "c.us") return null;

    const digits = digitsOnly(local);
    return digits.length >= PHONE_MIN_DIGITS && digits.length <= PHONE_MAX_DIGITS
      ? `${digits}@s.whatsapp.net`
      : null;
  }

  // Old tickets can contain the sender's local part, sometimes with its
  // Baileys device suffix, but without the original server name.
  const local = raw.split(":")[0];
  const digits = digitsOnly(local);
  if (!digits || !/^[+\d]+$/.test(local)) return null;
  if (digits.length >= PHONE_MIN_DIGITS && digits.length <= PHONE_MAX_DIGITS) {
    return `${digits}@s.whatsapp.net`;
  }
  if (digits.length <= 6 || (digits.length > PHONE_MAX_DIGITS && digits.length <= 20)) {
    return `${digits}@lid`;
  }
  return null;
}

// Compatibility export used by older lottery plugins.
export const asJid = getWhatsAppParticipantId;

export function findLotteryTicket(tickets, sender) {
  const senderId = String(sender || "").trim();
  const identity = getWhatsAppParticipantId(senderId);

  return (Array.isArray(tickets) ? tickets : []).find((ticket) => {
    const ticketId = String(ticket?.userId || "").trim();
    if (!ticketId) return false;
    if (ticketId === senderId) return true;

    const ticketIdentity = getWhatsAppParticipantId(ticketId);
    if (identity && ticketIdentity === identity) return true;

    // Older LID tickets discarded "@lid". Compare their local part only when
    // the incoming identity is already known to be a LID.
    if (identity?.endsWith("@lid") && !ticketId.includes("@")) {
      return ticketId.split(":")[0] === identity.split("@")[0];
    }

    return false;
  });
}

export function sanitizeLotteryDisplayName(value) {
  const name = String(value || "").trim();
  if (!name) return "";
  if (/^discord:\d{16,20}$/i.test(name)) return "";
  if (/@(?:s\.whatsapp\.net|c\.us|lid|g\.us)$/i.test(name)) return "";

  // Numeric profile names are phone numbers or internal IDs, not useful
  // display names. The verified phone identity is displayed separately.
  if (/^\+?[\d ().-]+$/.test(name)) {
    const digitCount = digitsOnly(name).length;
    if (digitCount >= PHONE_MIN_DIGITS && digitCount <= 20) return "";
  }
  return name;
}

export function lotteryWinnerIdentity(ticket) {
  const identity = String(ticket?.userId || "").trim();
  if (!identity) return "";
  if (identity.startsWith("discord:")) return identity;
  return getWhatsAppParticipantId(identity) || "";
}

export function lotteryDisplayName(ticket) {
  const name = sanitizeLotteryDisplayName(ticket?.name);
  if (name) return name;
  if (String(ticket?.userId || "").startsWith("discord:")) return "Discord user";

  const identity = lotteryWinnerIdentity(ticket);
  if (identity.endsWith("@s.whatsapp.net")) return identity.split("@")[0];
  return identity.endsWith("@lid") ? "WhatsApp user" : "Lottery player";
}

export function lotteryWinnerLabel(ticket) {
  const identity = lotteryWinnerIdentity(ticket);
  const phone = identity.endsWith("@s.whatsapp.net") ? identity.split("@")[0] : "";
  const name = lotteryDisplayName(ticket);
  if (!phone) return name;
  return name === phone ? `@${phone}` : `@${phone} (${name})`;
}
