const WEBSITE_URL = "https://aidoru.zone.id";

export default {
  name: "web",
  aliases: ["website", "site"],
  category: "utilities",
  cooldown: 5,
  description: "Get the AIDORU website link",
  usage: ".web",

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    const text = `╭─❀「 🌐 *𝐀𝐈𝐃𝐎𝐑𝐔 𝐖𝐄𝐁𝐒𝐈𝐓𝐄* 」❀─╮
│ Your trainer profile, Pokémon party,
│ cards, pets, Mart, battles and more.
│
│ ✦ Edit your profile background
│ ✦ Manage your party and PC
│ ✦ Join Pokémon battle rooms
│
│ 🔗 ${WEBSITE_URL}
╰───────────────❀`;

    return sock.sendMessage(jid, {
      text,
      contextInfo: {
        externalAdReply: {
          title: "AIDORU — Your Pokémon trainer world",
          body: "Manage your profile, Pokémon, cards, pets and live battles on the web.",
          sourceUrl: WEBSITE_URL,
          mediaType: 1,
          renderLargerThumbnail: false,
          showAdAttribution: false,
        },
      },
    }, { quoted: msg });
  },
};
