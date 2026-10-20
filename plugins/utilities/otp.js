import { getPendingWebsiteCode } from "../../lib/websiteAuth.mjs";

export default {
  name: "otp",
  description: "Send the one-time AIDORU website code in private chat or a group",
  category: "utilities",
  usage: ".otp",
  cooldown: 30,

  async run({ sock, msg, sender }) {
    const sourceChat = String(msg.key.remoteJid || "").trim();
    const quoted = { quoted: msg };
    const isGroup = sourceChat.endsWith("@g.us");
    const senderJid = [sender, msg.key.participant, msg.key.participantAlt, sourceChat]
      .map((value) => String(value || "").trim())
      .find((value) => value && !/@(?:g\.us|broadcast)$/i.test(value)) || "";

    if (!senderJid) {
      if (isGroup) {
        await sock.sendMessage(sourceChat, {
          text: "I couldn't identify who requested the code. Tag yourself and retry *.otp* here, or request it in a private chat.",
        }, quoted);
      }
      return;
    }

    try {
      const pending = await getPendingWebsiteCode(senderJid);
      if (isGroup) {
        // The requester explicitly invoked .otp in this group. Include a
        // mention so the code is clearly tied to the requesting member.
        await sock.sendMessage(sourceChat, {
          ...createOtpPayload({ pending, senderJid, isGroup: true }),
          mentions: [senderJid],
        }, { ...quoted, mentions: [senderJid] });
      } else {
        await sock.sendMessage(sourceChat, createOtpPayload({ pending, senderJid }), quoted);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create a reset code.";
      await sock.sendMessage(
        sourceChat,
        { text: isGroup
          ? "â I couldn't retrieve your code. Start verification or password recovery on the AIDORU website, then try *.otp* again."
          : `â ${message}` },
        quoted,
      );
    }
  },
};

export function createOtpPayload({ pending, senderJid, isGroup = false }) {
  const accountLabel = isGroup
    ? `@${senderJid.split("@")[0]}`
    : `*${senderJid.split("@")[0]}*`;

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
