// plugins/utilities/reqbot.js
const REQUEST_PAGE = "https://aidoru.zone.id/reqbot";

export default {
  name: "reqbot",
  description: "Request the bot to be added to your group",
  category: "main",
  usage: ".reqbot",
  aliases: ["botrequest", "requestbot"],
  cooldown: 30,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.1.0",

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    return sock.sendMessage(jid, {
      text:
        `🌸 *Request AIDORU for your group*\n\n` +
        `Sign in on the website, paste your WhatsApp group invite link, and submit it here:\n${REQUEST_PAGE}\n\n` +
        `A connected WhatsApp bot that is an admin in the staff-request group will forward it for review.`,
    }, { quoted: msg });
  }
};
