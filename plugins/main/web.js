const WEBSITE_URL = "https://aidoru.zone.id/";

export default {
  name: "web",
  aliases: ["website", "site"],
  category: "utilities",
  cooldown: 5,
  description: "Get the AIDORU website link",
  usage: ".web",

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid || msg.key.participant;
    if (!jid) return;

    const text = `╭─୨୧「 🌸 *𝐀𝐈𝐃𝐎𝐑𝐔 𝐂𝐎𝐌𝐌𝐔𝐍𝐈𝐓𝐘* 」୨୧─╮
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
╰────────「 ✦ 𝐒𝐓𝐀𝐑𝐓 𝐘𝐎𝐔𝐑 𝐉𝐎𝐔𝐑𝐍𝐄𝐘 ✦ 」────────╯`;

    const quoted = { quoted: msg };
    try {
      return await sock.sendMessage(jid, {
        text,
        contextInfo: {
          externalAdReply: {
            title: "🌸 AIDORU Community — Your Pokémon World",
            body: "Create your trainer profile, collect cards, raise Pokémon, care for pets and join battle rooms.",
            sourceUrl: WEBSITE_URL,
            canonicalUrl: WEBSITE_URL,
            mediaType: 1,
            renderLargerThumbnail: true,
            showAdAttribution: false,
          },
        },
      }, quoted);
    } catch (previewError) {
      // Some Baileys builds reject externalAdReply metadata. Never let that
      // prevent the actual website URL from reaching the user.
      console.warn("WEB_PREVIEW_FALLBACK:", previewError?.message || previewError);
      return sock.sendMessage(jid, { text }, quoted);
    }
  },
};
