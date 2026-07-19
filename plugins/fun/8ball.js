const answers = [
  "🟢 It is certain!",
  "🟢 Without a doubt.",
  "🟢 Yes, definitely!",
  "🟢 You may rely on it.",
  "🟢 As I see it, yes.",
  "🟢 Most likely.",
  "🟢 Outlook good!",
  "🟢 Signs point to yes.",
  "🟡 Reply hazy, try again.",
  "🟡 Ask again later.",
  "🟡 Better not tell you now.",
  "🟡 Cannot predict now.",
  "🟡 Concentrate and ask again.",
  "🔴 Don't count on it.",
  "🔴 My reply is no.",
  "🔴 My sources say no.",
  "🔴 Outlook not so good.",
  "🔴 Very doubtful.",
];

export default {
  name: "8ball",
  description: "Ask the magic 8-ball a yes/no question",
  category: "fun",
  usage: ".8ball <question>",
  aliases: ["eightball", "magic8"],
  cooldown: 3,

  async run({ sock, msg, text }) {
    if (!text) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "🎱 Ask me something!\n\nUsage: *.8ball <your question>*"
      }, { quoted: msg });
    }

    const answer = answers[Math.floor(Math.random() * answers.length)];

    await sock.sendMessage(msg.key.remoteJid, {
      text: `🎱 *Magic 8-Ball*\n\n❓ ${text}\n\n${answer}`
    }, { quoted: msg });
  }
};
