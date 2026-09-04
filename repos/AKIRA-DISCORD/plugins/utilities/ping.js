export default {
  name: "ping",
  aliases: ["latency", "speed"],
  category: "utilities",
  description: "Check bot response speed",
  usage: ".ping",
  cooldown: 3,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    const started = Date.now();
    const sent = await sock.sendMessage(jid, { text: "🏓 Checking response speed..." }, { quoted: msg });
    const elapsed = Date.now() - started;
    return sock.sendMessage(jid, {
      text: `╭─「 ⚡ 𝐀𝐈𝐃𝐎𝐑𝐔 𝐏𝐈𝐍𝐆 」─╮\n│ 🛰️ Response :: *${elapsed} ms*\n│ 🌸 Status   :: *Online*\n╰────────────────╯`,
      edit: sent.key,
    });
  },
};
