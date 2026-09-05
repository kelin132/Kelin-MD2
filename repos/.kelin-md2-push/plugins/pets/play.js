// plugins/pets/play.js
// .petplay — Play with your pet to increase happiness
import { getActivePet, savePet } from "../../lib/petDatabase.js";

const COOLDOWN_MS   = 1 * 60 * 60 * 1000; // 1 hour
const HAPPY_GAIN    = 20;

const PLAY_ACTIONS = [
  "runs around excitedly",
  "does a little spin",
  "jumps up and gives you a high-five",
  "rolls over and asks for belly rubs",
  "chases their tail happily",
  "brings you a gift",
  "purrs and nuzzles you",
  "howls with excitement",
  "glows with a warm aura",
];

export default {
  name: "petplay",
  description: "Play with your active pet",
  category: "pets",
  usage: ".play",
  aliases: ["playpet", "play"],
  checkJail: true,

  async run({ sock, msg }) {
    const jid    = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    const pet = await getActivePet(sender);
    if (!pet) {
      return sock.sendMessage(jid, {
        text: `🐾 You don't have an active pet!\n\nUse *.adopt* or *.pets select <ID>* first.`,
      }, { quoted: msg });
    }

    const now        = Date.now();
    const lastPlayed = pet.lastPlayed ? new Date(pet.lastPlayed).getTime() : 0;
    const elapsed    = now - lastPlayed;

    if (elapsed < COOLDOWN_MS) {
      const remaining = COOLDOWN_MS - elapsed;
      const mins      = Math.ceil(remaining / 60000);
      return sock.sendMessage(jid, {
        text: `😊 *${pet.name}* is tired from playing!\n\nCome back in *${mins} minute${mins !== 1 ? "s" : ""}* to play again.`,
      }, { quoted: msg });
    }

    const action       = PLAY_ACTIONS[Math.floor(Math.random() * PLAY_ACTIONS.length)];
    const oldHappy     = pet.happiness ?? 100;
    const newHappy     = Math.min(100, oldHappy + HAPPY_GAIN);
    // Slight hunger drain from playing
    const newHunger    = Math.max(0, (pet.hunger ?? 100) - 5);

    await savePet(sender, pet.petId, {
      happiness:  newHappy,
      hunger:     newHunger,
      lastPlayed: new Date().toISOString(),
    });

    return sock.sendMessage(jid, {
      text: [
        `😊 You play with *${pet.name}*!`,
        ``,
        `*${pet.name}* ${action}! 💕`,
        ``,
        `😊 Happiness: ${oldHappy}% → *${newHappy}%*`,
        `🍖 Hunger:    ${pet.hunger ?? 100}% → *${newHunger}%* (playing made them hungry!)`,
        ``,
        `Next play available in *1 hour*.`,
      ].join("\n"),
    }, { quoted: msg });
  },
};
