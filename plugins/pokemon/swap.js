// plugins/pokemon/swap.js
// Swap two Pokémon positions in your party with .swap <slot1> <slot2>
// .swap 1 5 — makes slot 5 your lead Pokémon (or any two positions)

import { getTrainer, setLeadPokemonId } from "../../lib/pokemon/players.mjs";
import { getTrainerParty } from "../../lib/pokemon/pokemonDb.mjs";
import { getBattle } from "../../lib/pokemon/battleState.mjs";
import { getDb } from "../../lib/mongo.mjs";

const typeEmojis = {
  fire:"🔥",water:"💧",grass:"🍃",electric:"⚡",psychic:"🔮",normal:"⭐",
  flying:"🌤️",bug:"🐛",poison:"☠️",rock:"🪨",ground:"🌍",ice:"❄️",
  fighting:"🥊",ghost:"👻",dragon:"🐉",dark:"🌑",steel:"⚙️",fairy:"🌸",
};

export default {
  name: "swap",
  aliases: ["swapparty", "partyswap"],
  description: "Swap two Pokémon positions in your party",
  category: "pokemon",
  usage: ".swap <slot1> <slot2>  e.g. .swap 1 5",

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;

    const trainer = await getTrainer(sender);
    if (!trainer) {
      return sock.sendMessage(jid, {
        text: "❌ Start your journey first! Use *.startjourney*",
      }, { quoted: msg });
    }

    // Block during battle
    const activeBattle = getBattle(jid);
    if (activeBattle && (activeBattle.challengerJid === sender || activeBattle.opponentJid === sender)) {
      return sock.sendMessage(jid, {
        text: "❌ You can't swap party positions during a battle!\nUse *.battle switch* to switch your active Pokémon instead.",
      }, { quoted: msg });
    }

    const party = await getTrainerParty(sender);
    if (!party || party.length === 0) {
      return sock.sendMessage(jid, {
        text: "❌ Your party is empty!\nCatch some Pokémon first.",
      }, { quoted: msg });
    }

    // Build ordered party from trainer.party ID array
    const partyIdArray = [...(trainer.party || [])];
    const idToParty = {};
    for (const p of party) {
      idToParty[(p._id || p.id)?.toString()] = p;
    }
    const orderedParty = partyIdArray
      .map(id => idToParty[id?.toString()])
      .filter(Boolean);

    // No args — show current party and usage
    if (!args[0] || !args[1]) {
      if (orderedParty.length < 2) {
        return sock.sendMessage(jid, {
          text: "❌ You need at least *2 Pokémon* in your party to swap positions!",
        }, { quoted: msg });
      }

      const slots = orderedParty.map((p, i) => {
        const icon = typeEmojis[p.primaryType] || "⭐";
        const hpBar = p.hp <= 0 ? "💀" : p.hp / p.maxHp > 0.5 ? "🟩" : p.hp / p.maxHp > 0.2 ? "🟨" : "🟥";
        const curLeadId = trainer.leadPokemonId?.toString();
        const isLead    = (p._id || p.id)?.toString() === curLeadId;
        const isStarter = p.isStarter;
        const tags = [isLead ? "⚡LEAD" : "", isStarter ? "🏅STARTER" : ""].filter(Boolean).join(" ");
        return `${i + 1}. ${icon}${hpBar} *${p.displayName || p.name}* Lv.${p.level} ❤️ ${p.hp}/${p.maxHp}${tags ? "  " + tags : ""}`;
      }).join("\n");

      return sock.sendMessage(jid, {
        text:
`🔀 *SWAP PARTY POSITIONS*

*Your Party:*
${slots}

━━━━━━━━━━━━━━━━━━━━
Usage: *.swap <slot1> <slot2>*
Example: *.swap 1 3* — swap slots 1 and 3
         *.swap 1 5* — move slot 5 to lead position`,
      }, { quoted: msg });
    }

    const slot1 = parseInt(args[0]);
    const slot2 = parseInt(args[1]);
    const maxSlot = orderedParty.length;

    if (
      isNaN(slot1) || isNaN(slot2) ||
      slot1 < 1 || slot2 < 1 ||
      slot1 > maxSlot || slot2 > maxSlot
    ) {
      return sock.sendMessage(jid, {
        text: `❌ Invalid slots! Choose between *1* and *${maxSlot}*.\nType *.swap* to see your party.`,
      }, { quoted: msg });
    }

    if (slot1 === slot2) {
      return sock.sendMessage(jid, {
        text: "❌ Choose two *different* slots to swap!",
      }, { quoted: msg });
    }

    const idx1 = slot1 - 1;
    const idx2 = slot2 - 1;

    // Swap positions in the ID array
    [partyIdArray[idx1], partyIdArray[idx2]] = [partyIdArray[idx2], partyIdArray[idx1]];

    // Save the new order
    const db = await getDb();
    await db.collection("pokemon_trainers").updateOne(
      { jid: sender },
      { $set: { party: partyIdArray } }
    );

    const p1 = orderedParty[idx1];
    const p2 = orderedParty[idx2];
    const name1 = p1.displayName || p1.name;
    const name2 = p2.displayName || p2.name;

    // When something swaps into slot 1, automatically update the lead
    let leadNote = "";
    if (slot1 === 1) {
      await setLeadPokemonId(sender, (p2._id || p2.id)?.toString());
      leadNote = `\n⚡ *${name2}* is now your lead Pokémon (goes first in battle)!`;
    } else if (slot2 === 1) {
      await setLeadPokemonId(sender, (p1._id || p1.id)?.toString());
      leadNote = `\n⚡ *${name1}* is now your lead Pokémon (goes first in battle)!`;
    }

    return sock.sendMessage(jid, {
      text:
`🔀 *Party positions swapped!*${leadNote}

✅ Slot ${slot1}: *${name2}* Lv.${p2.level}
✅ Slot ${slot2}: *${name1}* Lv.${p1.level}

Use *.party* to see your updated lineup.`,
    }, { quoted: msg });
  },
};
