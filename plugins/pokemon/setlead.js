// plugins/pokemon/setlead.js
// .setlead <slot>  — designate a party Pokémon to go first in every battle

import { getTrainer, setLeadPokemonId } from "../../lib/pokemon/players.mjs";
import { getTrainerParty } from "../../lib/pokemon/pokemonDb.mjs";

const TYPE_EMOJIS = {
  fire:"🔥",water:"💧",grass:"🍃",electric:"⚡",psychic:"🔮",normal:"⭐",
  flying:"🌤️",bug:"🐛",poison:"☠️",rock:"🪨",ground:"🌍",ice:"❄️",
  fighting:"🥊",ghost:"👻",dragon:"🐉",dark:"🌑",steel:"⚙️",fairy:"🌸",
};

export default {
  name: "setlead",
  aliases: ["leadpoke", "setleader", "lead"],
  description: "Set a party Pokémon as your battle lead (goes first in every battle)",
  category: "pokemon",
  usage: ".setlead <slot 1-6>",

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;

    const trainer = await getTrainer(sender);
    if (!trainer) {
      return sock.sendMessage(jid, {
        text: "❌ Start your journey first! Use *.startjourney*",
      }, { quoted: msg });
    }

    const party = await getTrainerParty(sender);
    if (!party || party.length === 0) {
      return sock.sendMessage(jid, {
        text: "❌ Your party is empty! Catch some Pokémon first.",
      }, { quoted: msg });
    }

    // Build ordered party using the trainer's party ID array
    const partyIdArr = trainer.party || [];
    const idMap = {};
    for (const p of party) idMap[(p._id || p.id)?.toString()] = p;
    const orderedParty = partyIdArr.map(id => idMap[id?.toString()]).filter(Boolean);
    for (const p of party) {
      const k = (p._id || p.id)?.toString();
      if (!orderedParty.some(x => (x._id || x.id)?.toString() === k)) orderedParty.push(p);
    }

    // No arg — show current lead and party
    if (!args[0]) {
      const curLeadId = trainer.leadPokemonId?.toString();
      const slots = orderedParty.map((p, i) => {
        const icon  = TYPE_EMOJIS[p.primaryType] || "⭐";
        const hpBar = p.hp <= 0 ? "💀" : p.hp / p.maxHp > 0.5 ? "🟩" : p.hp / p.maxHp > 0.2 ? "🟨" : "🟥";
        const isLead    = (p._id || p.id)?.toString() === curLeadId;
        const isStarter = p.isStarter;
        const tags = [isLead ? "⚡LEAD" : "", isStarter ? "🏅STARTER" : ""].filter(Boolean).join(" ");
        return `${i + 1}. ${icon}${hpBar} *${p.displayName || p.name}* Lv.${p.level}${tags ? "  " + tags : ""}`;
      }).join("\n");

      return sock.sendMessage(jid, {
        text:
`⚡ *SET BATTLE LEAD*

Your lead Pokémon goes first in every wild and PvP battle.

*Your Party:*
${slots}

━━━━━━━━━━━━━━━━━━━━
Usage: *.setlead <slot>*
Example: *.setlead 3* — makes slot 3 your lead`,
      }, { quoted: msg });
    }

    const slotNum = parseInt(args[0]);
    if (isNaN(slotNum) || slotNum < 1 || slotNum > orderedParty.length) {
      return sock.sendMessage(jid, {
        text: `❌ Invalid slot! Your party has *${orderedParty.length}* Pokémon (1–${orderedParty.length}).`,
      }, { quoted: msg });
    }

    const chosen = orderedParty[slotNum - 1];
    if (!chosen) {
      return sock.sendMessage(jid, { text: "❌ No Pokémon found in that slot!" }, { quoted: msg });
    }

    if ((chosen.hp || 0) <= 0) {
      return sock.sendMessage(jid, {
        text: `❌ *${chosen.displayName || chosen.name}* has fainted!\nA fainted Pokémon can't be your lead. Use *.heal* first.`,
      }, { quoted: msg });
    }

    await setLeadPokemonId(sender, (chosen._id || chosen.id).toString());

    const icon      = TYPE_EMOJIS[chosen.primaryType] || "⭐";
    const starterBadge = chosen.isStarter ? " 🏅" : "";

    return sock.sendMessage(jid, {
      text:
`⚡ *Lead Pokémon Set!*

${icon} *${chosen.displayName || chosen.name}${starterBadge}* Lv.${chosen.level} will now go first in every battle!

💡 Use *.swap* to reorder your party, or *.setlead* again to change your lead anytime.`,
    }, { quoted: msg });
  },
};
