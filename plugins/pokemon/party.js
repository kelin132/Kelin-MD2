// plugins/pokemon/party.js
// .party         — show full party as canvas image
// .party <1-6>   — show detailed stats of one Pokémon

import { getTrainer }       from "../../lib/pokemon/players.mjs";
import { getTrainerParty }  from "../../lib/pokemon/pokemonDb.mjs";
import { generatePartyCanvas } from "../../lib/pokemon/canvas.mjs";

const TYPE_EMOJIS = {
  fire:"🔥",water:"💧",grass:"🍃",electric:"⚡",psychic:"🔮",normal:"⭐",
  flying:"🌤️",bug:"🐛",poison:"☠️",rock:"🪨",ground:"🌍",ice:"❄️",
  fighting:"🥊",ghost:"👻",dragon:"🐉",dark:"🌑",steel:"⚙️",fairy:"🌸",
};

export default {
  name: "party",
  aliases: ["team", "lineup"],
  description: "View your party  |  .party <1-6> for detailed stats",
  category: "pokemon",
  usage: ".party  or  .party <slot>",

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;

    const trainer = await getTrainer(sender);
    if (!trainer) {
      return sock.sendMessage(jid, {
        text: "❌ Start your journey first! Use *.startjourney*",
      }, { quoted: msg });
    }

    const rawParty = await getTrainerParty(sender);

    if (!rawParty || rawParty.length === 0) {
      return sock.sendMessage(jid, {
        text:
`🎒 *YOUR PARTY IS EMPTY!*

Use *.t2party <pokémon name>* to move Pokémon from PC to party.
Or catch wild Pokémon with *.spawnpoke* then *.catch*!`,
      }, { quoted: msg });
    }

    // Build ordered party from trainer.party ID array
    const partyIdArray = trainer.party || [];
    const idMap = {};
    for (const p of rawParty) idMap[(p._id || p.id)?.toString()] = p;
    const party = partyIdArray.map(id => idMap[id?.toString()]).filter(Boolean);
    // Append any pokemon not in the ID array (safety fallback)
    for (const p of rawParty) {
      const key = (p._id || p.id)?.toString();
      if (!party.some(x => (x._id || x.id)?.toString() === key)) party.push(p);
    }

    // ── Single Pokémon detailed view ──────────────────────────────────────
    const slotArg = parseInt(args[0]);
    if (!isNaN(slotArg)) {
      if (slotArg < 1 || slotArg > party.length) {
        return sock.sendMessage(jid, {
          text: `❌ Invalid slot! Your party has *${party.length}* Pokémon (slots 1–${party.length}).`,
        }, { quoted: msg });
      }

      const p = party[slotArg - 1];
      const typeEmoji = TYPE_EMOJIS[p.primaryType] || "⭐";
      const allTypes  = (p.types || [p.primaryType]).map(t => `${TYPE_EMOJIS[t] || "⭐"} ${t}`).join("  ");
      const isFainted = p.hp <= 0;
      const hpPct     = p.maxHp > 0 ? p.hp / p.maxHp : 0;
      const hpBar     = isFainted ? "💀" : hpPct > 0.5 ? "🟩🟩🟩🟩🟩" : hpPct > 0.25 ? "🟨🟨🟨🟩🟩" : "🟥🟥🟨🟩🟩";
      const xpBar     = p.xpNeeded > 0 ? Math.round((p.xp / p.xpNeeded) * 10) : 0;
      const xpFill    = "▓".repeat(xpBar) + "░".repeat(10 - xpBar);

      const moveLines = (p.moves || []).map((m, i) =>
        `  *${i + 1}.* ${m.name}  *(Pwr: ${m.power || "—"})*\n       📖 ${m.desc || m.description || "No description"}`
      ).join("\n");

      const nick  = p.nickname ? `\n📛 *Nickname:* ${p.nickname}` : "";
      const shiny = p.shiny    ? "\n✨ *This Pokémon is SHINY!*" : "";
      const caughtStr = p.caughtAt ? new Date(p.caughtAt).toLocaleDateString() : "Unknown";

      const isLead2   = (p._id || p.id)?.toString() === (trainer.leadPokemonId || "").toString();
      const leadBadge = isLead2   ? "\n⚡ *LEAD POKÉMON* — goes first in every battle" : "";
      const strtBadge = p.isStarter ? "\n🏅 *STARTER POKÉMON* — cannot be given away" : "";

      const text =
`${typeEmoji} *${p.displayName || p.name}${p.shiny ? " ✨" : ""}* — Slot ${slotArg}${nick}${shiny}${leadBadge}${strtBadge}

━━━━━━━━━━━━━━━━━━━━
📊 *STATS*
• Level: *${p.level}*
• HP: *${Math.max(0, p.hp)}/${p.maxHp}* ${hpBar}
• Attack: *${p.attack}*    Defense: *${p.defense}*
• Speed: *${p.speed}*       Sp.Atk: *${p.spAtk || "?"}*
• Type: ${allTypes}
• XP: *${p.xp}/${p.xpNeeded}* [${xpFill}]
• Caught: ${caughtStr}

━━━━━━━━━━━━━━━━━━━━
⚔️ *MOVES*
${moveLines || "  No moves learned yet"}

━━━━━━━━━━━━━━━━━━━━
💡 *Tips:*
• *.setlead ${slotArg}* — Make this your battle lead${p.isStarter ? "\n\n🏅 *This is your Starter Pokémon* — it can never be given away or moved to PC." : ""}
• *.t2pc ${slotArg}* — Move to PC storage${p.isStarter ? " _(blocked for starter)_" : ""}`;

      return sock.sendMessage(jid, {
        image: { url: p.imageUrl },
        caption: text,
      }, { quoted: msg });
    }

    // ── Full party canvas view ─────────────────────────────────────────────
    let buf = null;
    try {
      buf = await generatePartyCanvas(party, trainer.username);
    } catch (err) {
      console.error("[party canvas]", err?.message);
    }

    const leadId  = trainer.leadPokemonId?.toString();
    const slots = party.map((p, i) => {
      const icon    = TYPE_EMOJIS[p.primaryType] || "⭐";
      const hpBar   = p.hp <= 0 ? "💀" : p.hp / p.maxHp > 0.5 ? "🟩" : p.hp / p.maxHp > 0.2 ? "🟨" : "🟥";
      const nick    = p.nickname ? ` "${p.nickname}"` : "";
      const shiny   = p.shiny    ? " ✨" : "";
      const isLead  = (p._id || p.id)?.toString() === leadId;
      const isStart = p.isStarter;
      const tags    = [isLead ? "⚡LEAD" : "", isStart ? "🏅STARTER" : ""].filter(Boolean).join(" ");
      return `${i + 1}. ${icon}${hpBar} *${p.displayName || p.name}${nick}${shiny}* Lv.${p.level} ❤️${p.hp}/${p.maxHp}${tags ? "  " + tags : ""}`;
    });

    const caption =
`⚡ *${trainer.username}'s Party* (${party.length}/6)

${slots.join("\n")}

━━━━━━━━━━━━━━━━━━━━
📋 *Commands:*
• *.party <1-6>* — Detailed stats for one Pokémon
• *.swap <slot1> <slot2>* — Reorder party positions
• *.t2pc <name>* — Move a Pokémon to PC
• *.t2party <name>* — Bring one from PC
• *.pc* — View PC storage`;

    if (buf) {
      await sock.sendMessage(jid, { image: buf, caption }, { quoted: msg });
    } else {
      await sock.sendMessage(jid, { text: caption }, { quoted: msg });
    }
  },
};
