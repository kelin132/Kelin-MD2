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
        `*Request a bot for your group *\n\n` +
        `Paste your WhatsApp group invite link, and submit it here:\n${REQUEST_PAGE}\n\n` +
        `Have fun.`,
    }, { quoted: msg });
  }
};
