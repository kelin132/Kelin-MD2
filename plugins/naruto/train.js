import players from "../../lib/player.js";

const cooldowns = new Map();
const training = {
  attack: { stat: "attack", gain: 2, emoji: "⚔️", label: "Attack" },
  defense: { stat: "defense", gain: 2, emoji: "🛡️", label: "Defense" },
  speed: { stat: "speed", gain: 2, emoji: "💨", label: "Speed" },
  chakra: { stat: "maxChakra", gain: 15, emoji: "💠", label: "Max Chakra" },
  hp: { stat: "maxHp", gain: 20, emoji: "❤️", label: "Max HP" },
};
const COST = 100;
const COOLDOWN = 5 * 60 * 1000;

export default {
  name: "ntrain",
  aliases: ["ntraining", "shinobitrain"],
  description: "Train a Naruto stat",
  category: "naruto",
  usage: ".ntrain <attack|defense|speed|chakra|hp>",
  cooldown: 3,

  async run({ sock, msg, text, sender }) {
    const jid = msg.key.remoteJid;
    const player = await players.get(sender);
    if (!player) {
      return sock.sendMessage(jid, { text: "🍃 Use *.nstart* before training." }, { quoted: msg });
    }

    const type = String(text || "").trim().toLowerCase();
    if (!type || !training[type]) {
      return sock.sendMessage(jid, {
        text: [
          "🥋 *TRAINING GROUNDS*",
          `Cost: *${COST} ryo*  |  Cooldown: *5 minutes*`,
          "",
          "`.ntrain attack`  `.ntrain defense`",
          "`.ntrain speed`   `.ntrain chakra`",
          "`.ntrain hp`",
        ].join("\n"),
      }, { quoted: msg });
    }

    const last = cooldowns.get(sender) || 0;
    if (Date.now() - last < COOLDOWN) {
      const seconds = Math.ceil((COOLDOWN - (Date.now() - last)) / 1000);
      return sock.sendMessage(jid, { text: `⏳ Your training cooldown is active for another *${seconds}s*.` }, { quoted: msg });
    }
    if ((player.ryo || 0) < COST) {
      return sock.sendMessage(jid, { text: `❌ You need ${COST} ryo, but only have ${player.ryo || 0}.` }, { quoted: msg });
    }

    const session = training[type];
    player.ryo -= COST;
    player[session.stat] += session.gain;
    if (session.stat === "maxHp") player.hp = Math.min(player.maxHp, player.hp + session.gain);
    if (session.stat === "maxChakra") player.chakra = Math.min(player.maxChakra, player.chakra + session.gain);
    player.updatedAt = Date.now();
    await player.save();
    cooldowns.set(sender, Date.now());

    return sock.sendMessage(jid, {
      text: `${session.emoji} Training complete. *${session.label} +${session.gain}*.\n💰 Ryo remaining: ${player.ryo}`,
    }, { quoted: msg });
  },
};