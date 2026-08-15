import { getProfilePic } from "../../lib/profileGen.mjs";
import { getOrCreateWebsiteId, syncWebsiteProfilePicture } from "../../lib/websiteAuth.mjs";

export default {
  name: "id",
  description: "Show your AIDORU website ID",
  category: "utilities",
  usage: ".id",
  cooldown: 10,

  async run({ sock, msg, sender }) {
    const chatId = msg.key.remoteJid;
    try {
      const websiteId = await getOrCreateWebsiteId(sender);
      const profilePictureUrl = await getProfilePic(sock, sender).catch(() => null);
      if (profilePictureUrl) await syncWebsiteProfilePicture(sender, profilePictureUrl);
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
