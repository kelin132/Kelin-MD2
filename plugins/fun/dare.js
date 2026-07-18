const dares = [
  "Send a voice note singing the WhatsApp notification sound.",
  "Change your profile picture to a potato for 10 minutes.",
  "Send a thumbs up to 5 different people in your contacts.",
  "Text 'I love you' to the last person you texted.",
  "Send a message using only emojis.",
];

export default {
  name: "dare",
  description: "Get a random dare challenge",
  category: "fun",
  usage: ".dare",
  aliases: ["d"],
  cooldown: 5,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg }) {
    const dare = dares[Math.floor(Math.random() * dares.length)];
    await sock.sendMessage(msg.key.remoteJid, { text: `🎯 *Dare:* ${dare}` });
  },
};
