// plugins/dragonball/dbztrain.js
// Power up your Dragon Ball fighter through training sessions
// Usage: .dbztrain [attack|defense|speed|ki|hp]

import players from "../../lib/dragonball/players.js";
import { getRankName } from "../../lib/dragonball/utils.js";

const TRAIN_COST_ZENI  = 100;
const TRAIN_COOLDOWNS  = new Map(); // sender → lastTrainedAt
const TRAIN_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between sessions

const TRAIN_SESSIONS = {
  attack:  { stat: "attack",  emoji: "⚔️",  gain: 2,  label: "Attack"  },
  defense: { stat: "defense", emoji: "🛡️",  gain: 2,  label: "Defense" },
  speed:   { stat: "speed",   emoji: "💨",  gain: 2,  label: "Speed"   },
  ki:      { stat: "maxKi",   emoji: "💠",  gain: 15, label: "Max KI"  },
  hp:      { stat: "maxHp",   emoji: "❤️",  gain: 20, label: "Max HP"  },
};

const TRAIN_MESSAGES = {
  attack: [
    "💥 You unleash thousands of punches — *Attack* rises!",
    "⚔️ Training against rocky cliffs all day — power surges!",
    "🔥 You spar relentlessly until your knuckles bleed — stronger!",
  ],
  defense: [
    "🛡️ You endure Kaioken pressure training for hours — defense hardens!",
    "💪 Weighted clothing taken off — you feel lighter AND tougher!",
    "🪨 You let boulders crash against you — body toughens!",
  ],
  speed: [
    "💨 You dash across the wasteland at blinding pace — faster!",
    "⚡ Instant Transmission training — your speed skyrockets!",
    "🌀 Dodging energy blasts all day — reflexes sharpen!",
  ],
  ki: [
    "💠 Meditating on the Lookout — KI reserves expand!",
    "🌟 Focusing your energy to the limit — KI grows stronger!",
    "🐉 Spirit energy flows through you — maximum KI rises!",
  ],
  hp: [
    "❤️ Zenkai boost from near-death training — health soars!",
    "💪 Surviving brutal punishment — body grows tougher!",
    "🏔️ High-gravity training complete — HP increases!",
  ],
};

function random(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export default {
  name: "dbztrain",
  description: "Train to increase your Dragon Ball fighter stats",
  category: "dragonball",
  usage: ".dbztrain [attack|defense|speed|ki|hp]",
  aliases: ["dbzpower", "dbzpowerup"],
  cooldown: 3,

  async run({ sock, msg, text, sender }) {
    const jid = msg.key.remoteJid;

    try {
      const player = await players.get(sender);
      if (!player) {
        return sock.sendMessage(jid, {
          text: "🐉 You don't have a fighter yet!\nUse *.dbzstart* to create one.",
        }, { quoted: msg });
      }

      const cmd = (text || "").trim().toLowerCase();

      // No argument — show training menu
      if (!cmd) {
        return sock.sendMessage(jid, {
          text: [
            "🐉 *TRAINING GROUNDS*",
            "━━━━━━━━━━━━━━━━━━━━━━━━",
            `💰 Cost: *${TRAIN_COST_ZENI} Zeni* per session`,
            `💰 Your Zeni: *${player.zeni}*`,
            "",
            "Choose what to train:",
            "  ⚔️  *.dbztrain attack*   — +2 ATK",
            "  🛡️  *.dbztrain defense*  — +2 DEF",
            "  💨  *.dbztrain speed*    — +2 SPD",
            "  💠  *.dbztrain ki*       — +15 Max KI",
            "  ❤️  *.dbztrain hp*       — +20 Max HP",
            "",
            "⏳ Cooldown: 5 minutes between sessions",
          ].join("\n"),
        }, { quoted: msg });
      }

      const session = TRAIN_SESSIONS[cmd];
      if (!session) {
        return sock.sendMessage(jid, {
          text: "❌ Unknown training type!\n\nOptions: *attack*, *defense*, *speed*, *ki*, *hp*",
        }, { quoted: msg });
      }

      // Cooldown check
      const lastTrained = TRAIN_COOLDOWNS.get(sender);
      if (lastTrained && Date.now() - lastTrained < TRAIN_COOLDOWN_MS) {
        const remaining = Math.ceil((TRAIN_COOLDOWN_MS - (Date.now() - lastTrained)) / 1000);
        return sock.sendMessage(jid, {
          text: `⏳ Training cooldown active — rest for *${remaining}s* before the next session.`,
        }, { quoted: msg });
      }

      // Zeni check
      if (player.zeni < TRAIN_COST_ZENI) {
        return sock.sendMessage(jid, {
          text: `❌ Not enough Zeni!\n\nYou need *${TRAIN_COST_ZENI}* but only have *${player.zeni}*.`,
        }, { quoted: msg });
      }

      // Apply stat change
      player.zeni              -= TRAIN_COST_ZENI;
      player[session.stat]      = (player[session.stat] || 0) + session.gain;
      if (session.stat === "maxHp") player.hp = Math.min(player.hp + session.gain, player.maxHp);
      if (session.stat === "maxKi") player.ki = Math.min(player.ki + session.gain, player.maxKi);

      await player.save();
      TRAIN_COOLDOWNS.set(sender, Date.now());

      const rank  = getRankName(player.level);
      const msg2  = random(TRAIN_MESSAGES[cmd]);

      return sock.sendMessage(jid, {
        text: [
          "💪 *TRAINING COMPLETE!*",
          "",
          msg2,
          "",
          `${session.emoji} *${session.label}* increased by *+${session.gain}*!`,
          `💰 Zeni spent: *${TRAIN_COST_ZENI}*  |  Remaining: *${player.zeni}*`,
          "",
          `⭐ Level: ${player.level} (${rank})`,
          `❤️ HP: ${player.hp}/${player.maxHp}`,
          `💠 KI: ${player.ki}/${player.maxKi}`,
          `⚔️ ATK: ${player.attack}  🛡️ DEF: ${player.defense}  💨 SPD: ${player.speed}`,
          "",
          "Train again in 5 minutes.",
        ].join("\n"),
      }, { quoted: msg });

    } catch (err) {
      console.error("DBZTRAIN ERROR:", err);
      return sock.sendMessage(jid, { text: "❌ Training failed — try again." }, { quoted: msg });
    }
  },
};
