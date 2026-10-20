export default {
  name: "addmember",
  description: "Explain the opt-in guild application process",
  category: "guild",
  usage: ".addmember",
  aliases: ["guildinvite", "ginvite", "gadd"],
  cooldown: 5,

  async run({ sock, msg }) {
    await sock.sendMessage(msg.key.remoteJid, {
      text: "Guild membership is opt-in now. A trainer applies with *.joinguild <guild name>*; the leader reviews requests with *.guildapps* and approves using *.guildapprove <code>*. No one is added without their own application.",
    }, { quoted: msg });
  },
};
