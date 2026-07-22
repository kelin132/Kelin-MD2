// plugins/pokemon/party.js
// View your active battle party as a canvas image

import { getTrainer } from "../../lib/pokemon/players.mjs";
import { getTrainerParty } from "../../lib/pokemon/pokemonDb.mjs";
import { generatePartyCanvas } from "../../lib/pokemon/canvas.mjs";

export default {
  name: "party",
  aliases: ["team", "lineup"],
  description: "View your active Pokémon party",
  category: "pokemon",
  usage: ".party",

  async run({ sock, msg, sender }) {
    const jid = msg.key.remoteJid;

    const trainer = await getTrainer(sender);
    if (!trainer) {
      return sock.sendMessage(jid, { text: "❌ Start your journey first! Use *.startjourney*" }, { quoted: msg });
    }

    const party = await getTrainerParty(sender);

    if (!party || party.length === 0) {
      return sock.sendMessage(jid, {
        text:
`🎒 *YOUR PARTY IS EMPTY!*

Use *.t2party <pokémon name>* to move Pokémon from PC.
Or catch wild Pokémon with *.wild* then *.catch*!`,
      }, { quoted: msg });
    }

    let buf = null;
    try {
      buf = await generatePartyCanvas(party, trainer.username);
    } catch (err) {
      console.error("[party canvas]", err?.message);
    }

    // Compact text fallback (also shown as caption under the image)
    const typeEmojis = {
      fire:"🔥",water:"💧",grass:"🍃",electric:"⚡",psychic:"🔮",normal:"⭐",
      flying:"🌤️",bug:"🐛",poison:"☠️",rock:"🪨",ground:"🌍",ice:"❄️",
      fighting:"🥊",ghost:"👻",dragon:"🐉",dark:"🌑",steel:"⚙️",fairy:"🌸",
    };
    const slots = party.map((p, i) => {
      const icon = typeEmojis[p.primaryType] || "⭐";
      const hpBar = p.hp <= 0 ? "💀" : p.hp / p.maxHp > 0.5 ? "🟩" : p.hp / p.maxHp > 0.2 ? "🟨" : "🟥";
      const nick = p.nickname ? ` "${p.nickname}"` : "";
      const shiny = p.shiny ? " ✨" : "";
      return `${i + 1}. ${icon}${hpBar} *${p.displayName || p.name}${nick}${shiny}* Lv.${p.level} ❤️${p.hp}/${p.maxHp}`;
    });

    const caption =
`⚡ *${trainer.username}'s Party* (${party.length}/6)

${slots.join("\n")}

💰 ${trainer.coins} coins  🏆 ${trainer.wins}W / ${trainer.losses}L`;

    if (buf) {
      await sock.sendMessage(jid, { image: buf, caption }, { quoted: msg });
    } else {
      await sock.sendMessage(jid, { text: caption }, { quoted: msg });
    }
  },
};
