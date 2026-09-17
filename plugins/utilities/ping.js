export default {
  name: "ping",
  aliases: ["latency", "speed"],
  category: "utilities",
  description: "Check bot response speed",
  usage: ".ping",
  cooldown: 3,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    // Keep ping to one outbound request. Editing a placeholder doubled the
    // network work and made slow connections report an even slower command.
    return sock.sendMessage(jid, {
      text: "╭─「 ⚡ 𝐀𝐈𝐃𝐎𝐑𝐔 𝐏𝐈𝐍𝐆 」─╮\n│ 🌸 Status    :: *Online*\n╰────────────────╯",
    });
  },
};
