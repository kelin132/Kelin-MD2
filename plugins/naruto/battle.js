import players from "../../lib/player.js";
import battleEngine from "../../lib/battle.js";
import jutsuList from "../../lib/jutsu.js";
import { healthBar, chakraBar, randomInt } from "../../lib/utils.js";

const activeBattles = new Map();
const enemies = [
  { name: "Rogue Ninja", hp: 130, chakra: 70, attack: 16, defense: 8, speed: 10, jutsu: ["basic_taijutsu", "clone_body_blow"] },
  { name: "Missing-nin", hp: 180, chakra: 100, attack: 21, defense: 12, speed: 13, jutsu: ["fireball", "basic_taijutsu"] },
  { name: "Akatsuki Scout", hp: 260, chakra: 150, attack: 28, defense: 18, speed: 16, jutsu: ["fireball", "shadow_clone"] },
];

function status(state) {
  return [
    `🥷 *${state.enemy.name}*`,
    `❤️ ${healthBar(state.enemy.hp, state.enemy.maxHp)} ${Math.max(0, state.enemy.hp)}/${state.enemy.maxHp}`,
    "",
    `👤 *${state.player.name}*`,
    `❤️ ${healthBar(state.player.hp, state.player.maxHp)} ${Math.max(0, state.player.hp)}/${state.player.maxHp}`,
    `💠 ${chakraBar(state.player.chakra, state.player.maxChakra)} ${Math.max(0, state.player.chakra)}/${state.player.maxChakra}`,
    "",
    "Use `.nbattle attack` or `.nbattle <jutsu id>`.",
  ].join("\n");
}

export default {
  name: "nbattle",
  aliases: ["nfight", "ninjafight"],
  description: "Battle a rogue Naruto enemy",
  category: "naruto",
  usage: ".nbattle [attack|jutsu id]",
  cooldown: 3,

  async run({ sock, msg, text, sender }) {
    const jid = msg.key.remoteJid;
    const player = await players.get(sender);
    if (!player) {
      return sock.sendMessage(jid, { text: "🍃 Use *.nstart* before entering battle." }, { quoted: msg });
    }

    let state = activeBattles.get(sender);
    const action = String(text || "").trim().toLowerCase();
    if (!state || !action || action === "start") {
      const enemy = { ...enemies[randomInt(0, enemies.length - 1)] };
      state = battleEngine.create(player, enemy);
      activeBattles.set(sender, state);
      return sock.sendMessage(jid, {
        text: `⚔️ *BATTLE STARTED*\n\n${status(state)}`,
      }, { quoted: msg });
    }

    const chosen = jutsuList.find((jutsu) =>
      jutsu.id === action && (player.jutsu || []).includes(jutsu.id)
    );
    const result = action === "attack"
      ? battleEngine.attack(state.player, state.enemy)
      : chosen
        ? battleEngine.useJutsu(state.player, state.enemy, chosen.id)
        : { error: "Unknown action. Use `attack` or a jutsu id you know." };
    if (result.error) {
      return sock.sendMessage(jid, { text: `❌ ${result.error}` }, { quoted: msg });
    }

    const log = [result.message];
    if (!battleEngine.isFinished(state)) {
      const enemyResult = battleEngine.enemyTurn(state.player, state.enemy);
      if (enemyResult?.message) log.push(enemyResult.message);
    }

    player.hp = Math.max(0, state.player.hp);
    player.chakra = Math.max(0, state.player.chakra);
    const winner = battleEngine.winner(state);
    if (winner) {
      activeBattles.delete(sender);
      if (winner === "player") {
        player.wins = (player.wins || 0) + 1;
        await player.save();
        const reward = await players.addXp(sender, 70);
        await players.addRyo(sender, 120);
        log.push(`🏆 Victory! +70 XP and +120 ryo.${reward?.levelledUp ? " Level up!" : ""}`);
      } else {
        player.losses = (player.losses || 0) + 1;
        await player.save();
        log.push("💀 You were defeated. Heal up and try again.");
      }
    } else {
      await player.save();
    }

    return sock.sendMessage(jid, {
      text: `${log.join("\n")}\n\n${winner ? "Battle ended." : status(state)}`,
    }, { quoted: msg });
  },
};