/**
 * KELIN MD — .pp command
 * Get a WhatsApp user's current profile picture.
 *
 * Supports:
 *   .pp                 — your own profile picture
 *   .pp @user           — a mentioned user's picture
 *   .pp                — reply to the user's message
 *   .pp 2348012345678  — a WhatsApp number
 */

function getContextInfo(msg) {
  return (
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo ||
    msg.message?.stickerMessage?.contextInfo ||
    msg.message?.buttonsResponseMessage?.contextInfo ||
    {}
  );
}

function digitsOnly(jid = "") {
  return String(jid).split("@")[0].split(":")[0].replace(/\D/g, "");
}

function resolveTarget(msg, sender, args) {
  const contextInfo = getContextInfo(msg);
  const mentionedJid = contextInfo.mentionedJid?.[0];
  if (mentionedJid) return mentionedJid;

  const quotedJid =
    contextInfo.participant ||
    contextInfo.quotedParticipant ||
    msg.quoted?.key?.participant;
  if (quotedJid) return quotedJid;

  const numberArg = args.find((arg) => /^\+?[0-9][0-9\s().-]{4,}$/.test(arg));
  if (numberArg) {
    const number = digitsOnly(numberArg);
    if (number.length >= 5) return `${number}@s.whatsapp.net`;
  }

  return sender;
}

export default {
  name: "pp",
  description: "Get a user's profile picture",
  category: "utilities",
  usage: ".pp [@user | WhatsApp number] or reply to a message",
  aliases: ["getpp", "profilepic", "avatar"],
  cooldown: 5,

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;
    const targetJid = resolveTarget(msg, sender, args);
    const targetNumber = digitsOnly(targetJid);
    const isSelf = targetJid === sender;

    if (!targetNumber) {
      return sock.sendMessage(
        jid,
        { text: "❌ I couldn't identify that WhatsApp user." },
        { quoted: msg },
      );
    }

    try {
      const pictureUrl = await sock.profilePictureUrl(targetJid, "image");
      const caption = isSelf
        ? "🖼️ *Your profile picture*"
        : `🖼️ *Profile picture of @${targetNumber}*`;

      await sock.sendMessage(
        jid,
        {
          image: { url: pictureUrl },
          caption,
          mentions: isSelf ? [] : [targetJid],
        },
        { quoted: msg },
      );
    } catch {
      const owner = isSelf ? "You don't" : "That user doesn't";
      await sock.sendMessage(
        jid,
        {
          text:
            `❌ ${owner} have an accessible profile picture.\n\n` +
            "The picture may be private or not set.",
        },
        { quoted: msg },
      );
    }
  },
};