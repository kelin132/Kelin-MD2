import { getOrCreateWebsiteId } from "../../lib/websiteAuth.mjs";

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
      await sock.sendMessage(chatId, {
        text: [
          "🎴 𝐀𝐂𝐂𝐎𝐔𝐍𝐓",
          "",
          "╭─「 🌸 𝐀𝐈𝐃𝐎𝐑𝐔 𝐈𝐃 」─╮",
          `│ 🪪 ID       › ${websiteId}`,
          "│",
          "│ 🔐 Set your website password on AIDORU,",
          "│ then sign in with this ID.",
          "│",
          "│ 🌐 https://aidoru.zone.id/",
          "╰────────────────╯",
          "",
          "Use *.otp* in a group if you need to reset it.",
        ].join("\\n"),
      }, { quoted: msg });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not retrieve your AIDORU ID.";
      await sock.sendMessage(chatId, { text: `❌ ${message}` }, { quoted: msg });
    }
  },
};
