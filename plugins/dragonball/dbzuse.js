/**
 * KELIN MD — .dbzuse command
 * Use items purchased from the DBZ shop.
 * Usage: .dbzuse <item name>
 */

import players from "../../lib/dragonball/players.js";
import techniqueLib from "../../lib/dragonball/techniques.js";
import { DBZ_SHOP_ITEMS } from "../../lib/dragonball/shopItems.js";
import { getRankName } from "../../lib/dragonball/utils.js";

const DIV = "╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌";

function prettyName(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default {
  name: "dbzuse",
  aliases: ["dbzitem", "dbzconsume"],
  description: "Use an item from your DBZ inventory",
  category: "dragonball",
  cooldown: 4,
  usage: ".dbzuse <item name>",

  async run({ sock, msg, sender, args }) {
    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });

    if (!args[0]) {
      return reply("❌ Usage: .dbzuse <item>\n\nCheck your items with *.dbzinventory*");
    }

    const itemName = args.join(" ").toLowerCase().replace(/\s+/g, "_");
    const itemDef  = DBZ_SHOP_ITEMS[itemName];

    if (!itemDef) {
      const known = Object.keys(DBZ_SHOP_ITEMS).join(", ");
      return reply(`❌ *${prettyName(itemName)}* is not a valid DBZ item.\n\nAvailable: ${known}`);
    }

    const player = await players.get(sender);
    if (!player) {
      return reply("🐉 You don't have a fighter yet!\nUse *.dbzstart* to create one.");
    }

    const inv = player.inventory || [];
    const idx = inv.indexOf(itemName);

    if (idx === -1) {
      return reply(`❌ You don't have a *${prettyName(itemName)}* in your inventory.\n\nBuy one from *.dbzshop*`);
    }

    const effects = (itemDef.useEffect || "").split(",");
    const gains = [];
    let learnedTech = null;

    for (const effect of effects) {
      const parts = effect.split(":");
      const key   = parts[0];

      if (key === "hp_pct") {
        const pct = parseInt(parts[1], 10);
        const heal = Math.floor((player.maxHp || 100) * pct / 100);
        player.hp = Math.min(player.maxHp, (player.hp || 0) + heal);
        gains.push(`+${heal} HP`);
      } else if (key === "ki_pct") {
        const pct = parseInt(parts[1], 10);
        const restore = Math.floor((player.maxKi || 80) * pct / 100);
        player.ki = Math.min(player.maxKi, (player.ki || 0) + restore);
        gains.push(`+${restore} KI`);
      } else if (key === "hp_full") {
        player.hp = player.maxHp;
        gains.push("HP fully restored");
      } else if (key === "ki_full") {
        player.ki = player.maxKi;
        gains.push("KI fully restored");
      } else if (key === "clear_cd") {
        gains.push("Cooldowns cleared");
      } else if (key === "learn") {
        const techId = parts[1];
        if (!(player.techniques || []).includes(techId)) {
          player.techniques = [...(player.techniques || []), techId];
          learnedTech = techId;
          gains.push(`Learned ${prettyName(techId)}`);
        }
      } else if (key === "stat") {
        const stat = parts[1];
        const val  = parseInt(parts[2], 10);
        if (stat === "attack")  { player.attack  = (player.attack  || 0) + val; gains.push(`+${val} ATK`); }
        if (stat === "defense") { player.defense = (player.defense || 0) + val; gains.push(`+${val} DEF`); }
        if (stat === "speed")   { player.speed   = (player.speed   || 0) + val; gains.push(`+${val} SPD`); }
      } else if (key === "buff") {
        const stat = parts[1];
        const pct  = parseInt(parts[2], 10);
        const buffs = player.buffs || {};
        buffs[stat] = (buffs[stat] || 0) + pct;
        player.buffs = buffs;
        gains.push(`+${pct}% ${stat} buff (next battle)`);
      }
    }

    inv.splice(idx, 1);
    player.inventory = inv;
    await player.save();

    const lines = [
      `╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮`,
      `┃  ✅ *Item Used!* ✅`,
      `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
      `┃`,
      `┃  ${itemDef.emoji}  *${prettyName(itemName)}*`,
      itemDef.description ? `┃  📖 _${itemDef.description}_` : null,
      `┃`,
      `${DIV}`,
    ];

    if (gains.length) lines.push(`┃  ✨ Effect: ${gains.join("  •  ")}`);

    if (learnedTech) {
      const tech = techniqueLib.find(t => t.id === learnedTech);
      if (tech) {
        lines.push(`${DIV}`);
        lines.push(`┃  🌟 *New Technique Learned!*`);
        lines.push(`┃  ${tech.name} — ${tech.damage} dmg, ${tech.ki} KI`);
        lines.push(`┃  _Use it in battle with .dbzhunt ki <n>_`);
      }
    }

    lines.push(`${DIV}`);
    lines.push(`┃  ⭐ Lv ${player.level}  ·  ${getRankName(player.level)}`);
    lines.push(`┃  ❤️ ${player.hp}/${player.maxHp}  ·  💠 ${player.ki}/${player.maxKi}`);
    lines.push(`┃  ⚔️ ATK ${player.attack}  🛡️ DEF ${player.defense}  💨 SPD ${player.speed}`);
    lines.push(`╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`);

    return reply(lines.filter(Boolean).join("\n"));
  },
};
