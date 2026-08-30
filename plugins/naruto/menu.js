export default {
  name: "naruto",
  aliases: ["ninja", "shinobi"],
  description: "Open the Naruto shinobi command guide",
  category: "naruto",
  usage: ".naruto",
  cooldown: 3,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    return sock.sendMessage(jid, {
      text: [
        "🍃 *NARUTO SHINOBI SYSTEM*",
        "",
        "`.nstart` — choose your clan and village",
        "`.nprofile` — view your shinobi profile",
        "`.ntrain` — train a stat for ryo",
        "`.njutsu` — view or learn jutsu",
        "`.nmission` — take a mission for XP and ryo",
        "`.nshop` — buy ninja items",
        "`.ninventory` — view or use items",
        "`.nleaderboard` — top shinobi",
        "`.nbattle` — fight a rogue ninja",
      ].join("\n"),
    }, { quoted: msg });
  },
};