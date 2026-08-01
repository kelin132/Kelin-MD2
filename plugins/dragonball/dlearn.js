// plugins/dragonball/dlearn.js
// Learn Dragon Ball Z techniques
// Usage: .dlearn [list | <technique-id>]

import players       from "../../lib/dragonball/players.js";
import techniqueLib  from "../../lib/dragonball/techniques.js";
import { getRankName } from "../../lib/dragonball/utils.js";

const LEARN_COST = {
  "1": 200,
  "2": 500,
  "3": 1200,
  "4": 3000,
};

export default {
  name: "dlearn",
  description: "Learn Dragon Ball Z techniques using Zeni",
  category: "dragonball",
  usage: ".dlearn [list | <technique-id>]",
  aliases: ["dbzlearn", "dtechnique"],
  cooldown: 3,

  async run({ sock, msg, text, sender }) {
    const jid = msg.key.remoteJid;

    try {
      const player = await players.get(sender);
      if (!player) {
        return sock.sendMessage(jid, { text: "🐉 Create your fighter first with *.dbzstart*" }, { quoted: msg });
      }

      const known = new Set(
        (player.techniques || []).map((t) => (typeof t === "string" ? t : t.id))
      );

      const cmd = (text || "").trim().toLowerCase();

      if (!cmd || cmd === "list") {
        const available = techniqueLib.filter((t) => !known.has(t.id) && player.level >= t.level);
        if (!available.length) {
          return sock.sendMessage(jid, {
            text: [
              "🌀 *TECHNIQUE SHOP*",
              `━━━━━━━━━━━━━━━━━━`,
              ``,
              available.length
                ? ""
                : `⚠️ No new techniques available at your level (${player.level}).`,
              `Train harder to unlock more!`,
              ``,
              `💰 Your Zeni: *${player.zeni}*`,
            ].join("\n"),
          }, { quoted: msg });
        }

        const lines = [
          "🌀 *TECHNIQUE SHOP*",
          `━━━━━━━━━━━━━━━━━━`,
          `💰 Your Zeni: *${player.zeni}*`,
          `⭐ Level: *${player.level}*`,
          ``,
          "Available techniques:",
          "",
        ];

        available.forEach((t) => {
          const cost = LEARN_COST[t.rank] || 500;
          lines.push(`🌀 \`${t.id}\` — *${t.name}*`);
          lines.push(`   Rank ${t.rank} | ${t.damage > 0 ? `${t.damage} dmg` : "support"} | ${t.ki} KI | Cost: ${cost} Zeni`);
          lines.push(`   _${t.description || ""}_`);
          lines.push("");
        });

        lines.push("Learn with: *.dlearn <technique-id>*");

        return sock.sendMessage(jid, { text: lines.join("\n") }, { quoted: msg });
      }

      // Learn a specific technique
      const tech = techniqueLib.find((t) => t.id === cmd || t.name.toLowerCase() === cmd);
      if (!tech) {
        return sock.sendMessage(jid, {
          text: `❌ Technique "*${cmd}*" not found.\n\nUse *.dlearn list* to see available techniques.`,
        }, { quoted: msg });
      }

      if (known.has(tech.id)) {
        return sock.sendMessage(jid, { text: `✅ You already know *${tech.name}*!` }, { quoted: msg });
      }
      if (player.level < tech.level) {
        return sock.sendMessage(jid, {
          text: `❌ Need level *${tech.level}* to learn *${tech.name}* (you are level ${player.level}).`,
        }, { quoted: msg });
      }

      const cost = LEARN_COST[tech.rank] || 500;
      if (player.zeni < cost) {
        return sock.sendMessage(jid, {
          text: `❌ Not enough Zeni!\n\n*${tech.name}* costs *${cost} Zeni* (you have ${player.zeni}).`,
        }, { quoted: msg });
      }

      await Promise.all([
        players.update(sender, { $inc: { zeni: -cost } }),
        players.learnTechnique(sender, tech.id),
      ]);

      return sock.sendMessage(jid, {
        text: [
          `🌀 *TECHNIQUE LEARNED!*`,
          ``,
          `⚡ *${tech.name}* has been added to your arsenal!`,
          `💰 Spent: *${cost} Zeni*`,
          ``,
          `📊 ${tech.damage > 0 ? `${tech.damage} damage` : "Support"}  |  ${tech.ki} KI  |  ${tech.cooldown}T cooldown`,
          `_${tech.description || ""}_`,
          ``,
          `Use it in battle with *.dbattle ki <n>* or *.dhunt ki <n>*`,
        ].join("\n"),
      }, { quoted: msg });

    } catch (err) {
      console.error("DLEARN ERROR:", err);
      return sock.sendMessage(jid, { text: "❌ Failed to process technique. Try again." }, { quoted: msg });
    }
  },
};
