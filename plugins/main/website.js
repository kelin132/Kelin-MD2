import { readFile } from "node:fs/promises";

const WEBSITE_URL = "https://aidoru.zone.id/";
const PREVIEW_IMAGE_URL = new URL("../../assets/aidoru-web-preview.jpg", import.meta.url);
let previewThumbnailPromise;

function getPreviewThumbnail() {
  if (!previewThumbnailPromise) {
    previewThumbnailPromise = readFile(PREVIEW_IMAGE_URL).catch(() => null);
  }
  return previewThumbnailPromise;
}

function buildWebsiteMessage() {
  return `╭─୨୧「 🌸 *𝐀𝐈𝐃𝐎𝐑𝐔 𝐂𝐎𝐌𝐌𝐔𝐍𝐈𝐓𝐘* 」୨୧─╮
│ A soft little home for every trainer,
│ collector and Pokémon dreamer. ✨
│
│ ✦ Build your trainer profile and showcase your style
│ ✦ Track your XP, level, Pokémon party and cards
│ ✦ Care for your pets and explore the Mart
│ ✦ Create or join lively Pokémon battle rooms
│ ✦ Meet other members of the AIDORU community
│
│ Come in, choose your next adventure,
│ and let your collection sparkle. 🌷
│
│ 🔗 ${WEBSITE_URL}
╰──────────────────`.trim();
}

export default {
  name: "web",
  aliases: ["website", "site"],
  category: "utilities",
  cooldown: 5,
  description: "Open the new AIDORU Community website",
  usage: ".web",

  async run({ sock, msg }) {
    const chatId = msg.key.remoteJid || msg.key.participant;
    if (!chatId) return;

    const text = buildWebsiteMessage();
    const linkPreview = {
      "canonical-url": WEBSITE_URL,
      "matched-text": WEBSITE_URL,
      title: "🌸 AIDORU Community — Your Pokémon World",
      description: "Create your trainer profile, collect cards, raise Pokémon, care for pets and join battle rooms.",
      jpegThumbnail: await getPreviewThumbnail(),
    };

    try {
      return await sock.sendMessage(
        chatId,
        { text, linkPreview },
        { quoted: msg },
      );
    } catch (error) {
      console.warn("[web] link preview failed; sending visible text fallback:", error?.message || error);
      return sock.sendMessage(chatId, { text }, { quoted: msg });
    }
  },
};
