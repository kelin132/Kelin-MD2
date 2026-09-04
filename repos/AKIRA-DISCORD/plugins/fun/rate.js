 export default {
  name: "rate",
  description: "Rate a person or something",
  category: "fun",
  usage: ".rate <name>",
  aliases: ["rating"],
  cooldown: 5,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",

  async run({ sock, msg, text }) {
    try {
      if (!text) {
        return await sock.sendMessage(msg.key.remoteJid, {
          text: "❌ Please provide something to rate\n\nExample: .rate Kelin"
        }, { quoted: msg });
      }

      const rating = Math.floor(Math.random() * 101);

      let comment;

      if (rating >= 90) {
        comment = "🔥 Perfect! Legendary level!";
      } else if (rating >= 70) {
        comment = "😍 Very good! Almost perfect!";
      } else if (rating >= 50) {
        comment = "🙂 Not bad, pretty decent!";
      } else if (rating >= 30) {
        comment = "😅 Needs some improvement!";
      } else {
        comment = "💀 Better luck next time!";
      }

      const message = `
╭━━━〔 ⭐ RATE SYSTEM ⭐ 〕━━━╮

👤 Target: ${text}
📊 Rating: ${rating}/100

💬 Result:
${comment}

╰━━━━━━━━━━━━━━━━━━╯
`;

      await sock.sendMessage(msg.key.remoteJid, {
        text: message
      }, { quoted: msg });

    } catch (err) {
      console.error(err);
      await sock.sendMessage(msg.key.remoteJid, {
        text: "❌ Error while rating!"
      }, { quoted: msg });
    }
  }
};