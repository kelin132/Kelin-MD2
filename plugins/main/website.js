const WEBSITE_URL = "https://aidoru.zone.id/";

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

function buildPreview() {
  return {
    title: "🌸 AIDORU Community — Your Pokémon World",
    body: "Create your trainer profile, collect cards, raise Pokémon, care for pets and join battle rooms.",
    sourceUrl: WEBSITE_URL,
    canonicalUrl: WEBSITE_URL,
    mediaType: 1,
    renderLargerThumbnail: true,
    showAdAttribution: false,
  };
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
    const quoted = { quoted: msg };

    try {
      return await sock.sendMessage(chatId, {
        text,
        contextInfo: { externalAdReply: buildPreview() },
      }, quoted);
    } catch (previewError) {
      console.warn("WEB_PREVIEW_FALLBACK:", previewError?.message || previewError);
      return sock.sendMessage(chatId, { text }, quoted);
    }
  },
};
