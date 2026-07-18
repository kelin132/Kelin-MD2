const jokes = [
  "Why don't scientists trust atoms? Because they make up everything!",
  "Why did the JavaScript developer go broke? Because he used up all his cache.",
  "Why do programmers prefer dark mode? Because light attracts bugs.",
  "A SQL query walks into a bar, walks up to two tables and asks... Can I join you?",
  "How many programmers does it take to change a light bulb? None — it's a hardware problem.",
  "Why do Java developers wear glasses? Because they don't C#.",
  "What's a programmer's favorite hangout place? Foo Bar.",
  "Why was the computer cold? It left its Windows open.",
  "I would tell you a UDP joke, but you might not get it.",
  "There are 10 types of people: those who understand binary, and those who don't.",
];

export default {
  name: "joke",
  description: "Get a random programming joke",
  category: "fun",
  usage: ".joke",
  aliases: ["jk"],
  cooldown: 3,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg }) {
    const joke = jokes[Math.floor(Math.random() * jokes.length)];
    await sock.sendMessage(msg.key.remoteJid, { text: `😂 ${joke}` });
  },
};
