const truths = [
  "What's the most embarrassing thing you've ever texted the wrong person?",
  "Have you ever lied about your age?",
  "What's the weirdest dream you've ever had?",
  "Have you ever stalked someone's profile for more than 30 minutes?",
  "What's the longest you've gone without showering?",
];

export default {
  name: "truth",
  description: "Get a random truth question",
  category: "fun",
  usage: ".truth",
  aliases: ["t"],
  cooldown: 5,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg }) {
    const truth = truths[Math.floor(Math.random() * truths.length)];
    await sock.sendMessage(msg.key.remoteJid, { text: `🤔 *Truth:* ${truth}` });
  },
};
