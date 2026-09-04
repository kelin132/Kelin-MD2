const quotes = [
  "The only way to do great work is to love what you do. — Steve Jobs",
  "Innovation distinguishes between a leader and a follower. — Steve Jobs",
  "Code is like humor. When you have to explain it, it's bad. — Cory House",
  "First, solve the problem. Then, write the code. — John Johnson",
  "Any fool can write code that a computer can understand. Good programmers write code that humans can understand. — Martin Fowler",
  "Programs must be written for people to read, and only incidentally for machines to execute. — Harold Abelson",
];

export default {
  name: "quote",
  description: "Get an inspirational quote",
  category: "fun",
  usage: ".quote",
  aliases: ["q", "inspire"],
  cooldown: 3,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg }) {
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    await sock.sendMessage(msg.key.remoteJid, { text: `💡 _"${quote}"_` });
  },
};
