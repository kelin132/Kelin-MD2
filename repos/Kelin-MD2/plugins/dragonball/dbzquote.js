/**
 * KELIN MD — .dbzquote command
 * Get a random Dragon Ball Z quote.
 */

const QUOTES = [
  { text: "Power comes in response to a need, not a desire. You have to create that need.", character: "Goku" },
  { text: "I am the hope of the universe. I am the answer to all living things that cry out for peace.", character: "Goku" },
  { text: "Even the lowliest warrior can surpass an elite, with enough hard work.", character: "Goku" },
  { text: "You may have invaded my mind and my body, but there’s one thing a Saiyan always keeps: his pride!", character: "Vegeta" },
  { text: "Strength is the only thing that matters in this world. Everything else is just a delusion for the weak.", character: "Vegeta" },
  { text: "I am a Saiyan, the prince of all Saiyans!", character: "Vegeta" },
  { text: "It is not a sin to fight for the right cause. There are those who words alone will not reach.", character: "Android 16" },
  { text: "You'll laugh at your fears when you find out who you are.", character: "Piccolo" },
  { text: "I'd rather be a brainless monkey than a heartless monster.", character: "Goku" },
  { text: "The turtle hermit way: Work hard, study well, and eat and sleep plenty!", character: "Master Roshi" }
];

export default {
  name: "dbzquote",
  description: "Get a random Dragon Ball Z quote",
  category: "dragonball",
  usage: ".dbzquote",
  aliases: ["dbzq"],
  cooldown: 5,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    
    const text = `🐉 *DRAGON BALL QUOTE*\n\n"${quote.text}"\n\n— *${quote.character}*`;
    
    return sock.sendMessage(jid, { text }, { quoted: msg });
  }
};
