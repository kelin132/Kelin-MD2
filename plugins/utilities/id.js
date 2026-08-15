import { getOrCreateWebsiteId } from "../../lib/websiteAuth.mjs";

export default {
  name: "id",
  description: "Show your AIDORU website ID",
  category: "utilities",
  usage: ".id",
  cooldown: 10,

  async run({ sock, msg, sender }) {
    const chatId = msg.key.remoteJid;
    if (chatId?.endsWith("@g.us")) {
      return sock.sendMessage(chatId, {
        text: "🔐 Use *.id* in a private chat with the bot so your account identifier stays private.",
      }, { quoted: msg });
    }

    try {
      const websiteId = await getOrCreateWebsiteId(sender);
      await sock.sendMessage(chatId, {
        text: [
          "🪪 *YOUR AIDORU ID*",
          "",
          `ID: *${websiteId}*`,
          "",
          "Use this ID with the password from *.wpw* to sign in on the AIDORU website.",
        ].join("\n"),
      }, { quoted: msg });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not retrieve your AIDORU ID.";
      await sock.sendMessage(chatId, { text: `❌ ${message}` }, { quoted: msg });
    }
  },
};
