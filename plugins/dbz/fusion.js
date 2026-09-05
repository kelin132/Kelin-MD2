export default {
  name: "fusion",
  aliases: ["fuse", "fusiondance"],
  category: "dbz",
  description: "Perform a Dragon Ball fusion roleplay",
  usage: ".fusion @partner",
  cooldown: 8,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (!mentions.length) {
      return sock.sendMessage(jid, { text: "❌ Mention your fusion partner.\n\nExample: *.fusion @partner*" }, { quoted: msg });
    }
    const partner = `@${mentions[0].split("@")[0]}`;
    const power = Math.floor(50_000 + Math.random() * 950_000);
    return sock.sendMessage(jid, {
      text: `╭━━〔 ✨ 𝐅𝐔𝐒𝐈𝐎𝐍 𝐃𝐀𝐍𝐂𝐄 〕━━╮\n┃ 🕺 You and ${partner}\n┃\n┃ *Fusion... HAAAA!*\n┃ ⚡ Fusion power :: *${power.toLocaleString()}*\n┃ 🌟 Result :: *A new warrior awakens!*\n╰━━━━━━━━━━━━━━━━━━━━╯`,
      mentions,
    }, { quoted: msg });
  },
};
