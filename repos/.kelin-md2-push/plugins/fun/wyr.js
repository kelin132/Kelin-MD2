// plugins/fun/wyr.js
// .wyr — Would You Rather question
const QUESTIONS = [
  ["Be able to fly", "Be invisible"],
  ["Have unlimited money", "Have unlimited time"],
  ["Never eat your favourite food again", "Never see your favourite person again"],
  ["Know when you'll die", "Know how you'll die"],
  ["Be the funniest person in the room", "Be the smartest person in the room"],
  ["Live in the past", "Live in the future"],
  ["Never sleep again", "Sleep 20 hours a day"],
  ["Speak every language", "Play every instrument"],
  ["Be famous for something embarrassing", "Not be famous at all"],
  ["Lose all your memories", "Never make new ones"],
  ["Always be 10 minutes late", "Always be 20 minutes early"],
  ["Have a pet dragon", "Have a pet dinosaur"],
  ["Give up the internet", "Give up showering for a month"],
  ["Never be able to lie", "Never be able to tell the truth"],
  ["Be able to read minds", "Be able to control time"],
  ["Be incredibly rich but lonely", "Be poor but surrounded by friends"],
  ["Only be able to whisper", "Only be able to shout"],
  ["Eat spiders", "Drink a glass of rotten milk"],
  ["Restart your life", "Fast forward 10 years"],
  ["Be a superhero", "Be a supervillain"],
  ["Live without music", "Live without movies"],
  ["Have hiccups forever", "Always feel like you need to sneeze"],
  ["Only eat sweet foods", "Only eat salty foods"],
  ["Meet your ancestors", "Meet your great-grandchildren"],
  ["Be the best player on a losing team", "The worst player on a winning team"],
  ["Always know when someone is lying", "Always get away with lying"],
  ["Have a rewind button for your life", "A pause button"],
  ["Fight 10 duck-sized horses", "1 horse-sized duck"],
  ["Have unlimited battery on your phone", "Never need to charge anything"],
  ["Be able to teleport", "Be able to time travel"],
];

export default {
  name: "wyr",
  description: "Would You Rather question",
  category: "fun",
  usage: ".wyr",
  aliases: ["wouldyourather", "wyro"],
  cooldown: 5,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    const q   = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];

    return sock.sendMessage(jid, {
      text: [
        `🤔 *WOULD YOU RATHER?*`,
        ``,
        `🅰️ ${q[0]}`,
        ``,
        `          — OR —`,
        ``,
        `🅱️ ${q[1]}`,
        ``,
        `Reply with *A* or *B*!`,
      ].join("\n"),
    }, { quoted: msg });
  },
};
