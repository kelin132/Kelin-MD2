import { getPendingWebsiteCode } from "../../lib/websiteAuth.mjs";

export default {
  name: "otp",
  description: "Show the one-time AIDORU website code in a group",
  category: "utilities",
  usage: ".otp",
  cooldown: 30,

  async run({ sock, msg, sender }) {
    const sourceChat = String(msg.key.remoteJid || "").trim();
    const quoted = { quoted: msg };
    const isGroup = sourceChat.endsWith("@g.us");
    // Codes are intentionally group-only. Do not reveal a code or start a
    // private reply when this command is used in a direct chat.
    if (!isGroup) return;

    const senderJid = [sender, msg.key.participant, msg.key.participantAlt, sourceChat]
      .map((value) => String(value || "").trim())
      .find((value) => value && !/@(?:g\.us|broadcast)$/i.test(value)) || "";

    if (!senderJid) {
      await sock.sendMessage(sourceChat, {
        text: "I couldn't identify who requested the code. Mention yourself and retry *.otp* in this group.",
      }, quoted);
      return;
    }

    try {
      const pending = await getPendingWebsiteCode(senderJid);
      // The requester explicitly invoked .otp in this group. Include a
      // mention so the code is clearly tied to the requesting member.
      await sock.sendMessage(sourceChat, {
        ...createOtpPayload({ pending, senderJid }),
        mentions: [senderJid],
      }, { ...quoted, mentions: [senderJid] });
    } catch (error) {
      await sock.sendMessage(
        sourceChat,
        { text: "I couldn't retrieve your code. Start verification or password recovery on the AIDORU website, then try *.otp* again in this group." },
        quoted,
      );
    }
  },
};

export function createOtpPayload({ pending, senderJid }) {
  const accountLabel = `@${senderJid.split("@")[0]}`;

  return {
    text: [
      pending.kind === "verification"
        ? "ð *AIDORU WEBSITE VERIFICATION CODE*"
        : "ð *AIDORU PASSWORD RESET CODE*",
      "",
      `For: ${accountLabel}`,
      `One-time code: *${pending.code}*`,
      "",
      `Enter this six-digit code on the AIDORU website before ${new Date(pending.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`,
    ].join("\n"),
  };
}
