// plugins/pokemon/party.js
// .party         — show full party as canvas image
// .party <1-6>   — show detailed stats of one Pokémon

import { getTrainer }       from "../../lib/pokemon/players.mjs";
import { getTrainerParty, getPokemonXpNeeded }  from "../../lib/pokemon/pokemonDb.mjs";
import { generatePartyCanvas } from "../../lib/pokemon/canvas.mjs";
import { TYPE_MOVES } from "../../lib/pokemon/gameLogic.mjs";
import { getImageMessage } from "../../lib/pokemon/api.mjs";

// Flat name→move lookup so we can fill in pp/accuracy for older stored moves
const MOVE_LOOKUP = Object.values(TYPE_MOVES).flat().reduce((acc, m) => {
  acc[m.name.toLowerCase()] = m;
  return acc;
}, {});

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
        text: "❌ Start your journey first! Use `.startjourney`",
      }, { quoted: msg });
    }

    const rawParty = await getTrainerParty(sender);

    if (!rawParty || rawParty.length === 0) {
      return sock.sendMessage(jid, {
        text:
`🎒 *YOUR PARTY IS EMPTY!*

Use \`.t2party <pokémon name>\` to move Pokémon from PC to party.
Or catch wild Pokémon with \`.spawnpoke\` then \`.catch\`!`,
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
      const statusText = isFainted ? "𝗙𝗔𝗜𝗡𝗧𝗘𝗗" : "𝗔𝗟𝗜𝗩𝗘";
      const hpPct     = p.maxHp > 0 ? p.hp / p.maxHp : 0;
      const hpBar     = isFainted ? "💀" : hpPct > 0.5 ? "🟩🟩🟩🟩🟩" : hpPct > 0.25 ? "🟨🟨🟨🟩🟩" : "🟥🟥🟨🟩🟩";
      
      const currentXp = p.xp ?? p.exp ?? 0;
      const xpNeeded  = getPokemonXpNeeded(p.level);
      const xpBar     = xpNeeded > 0 ? Math.min(10, Math.round((currentXp / xpNeeded) * 10)) : 10;
      const xpFill    = "▓".repeat(xpBar) + "░".repeat(10 - xpBar);
      const xpText    = xpNeeded > 0 ? `\`${currentXp}/${xpNeeded}\`` : "`MAX LEVEL`";

      const moveLines = (p.moves || []).map((m, i) => {
        const def      = MOVE_LOOKUP[m.name?.toLowerCase()] || m;
        const pp       = def.pp       ?? m.pp       ?? "—";
        const power    = def.power    ?? m.power    ?? "—";
        const accuracy = def.accuracy ?? m.accuracy ?? null;
        const accStr   = accuracy === null ? "∞" : `${accuracy}%`;
        return `  *${i + 1}.* ${m.name}  *(Pwr: ${power || "—"} | PP: ${pp} | Acc: ${accStr})*\n       📖 ${m.desc || m.description || def.desc || "No description"}`;
      }).join("\n");

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
• Level: \`${p.level}\`
• HP: \`${Math.max(0, p.hp)}/${p.maxHp}\` ${hpBar}
• Status: *${statusText}*
• Attack: \`${p.attack}\`    Defense: \`${p.defense}\`
• Speed: \`${p.speed}\`       Sp.Atk: \`${p.spAtk || "?"}\`
• Type: ${allTypes}
• XP: ${xpText} [${xpFill}]
• Caught: ${caughtStr}

━━━━━━━━━━━━━━━━━━━━
⚔️ *MOVES*
${moveLines || "  No moves learned yet"}

━━━━━━━━━━━━━━━━━━━━
💡 *Tips:*
• \`.setlead ${slotArg}\` — Make this your battle lead${p.isStarter ? "\n\n🏅 *This is your Starter Pokémon* — it can never be given away or moved to PC." : ""}
• \`.t2pc ${slotArg}\` — Move to PC storage${p.isStarter ? " _(blocked for starter)_" : ""}`;

      const imageMessage = await getImageMessage({
        pokedexId: p.pokedexId || p.id,
        imageUrl: p.imageUrl,
      });
      return sock.sendMessage(
        jid,
        imageMessage ? { ...imageMessage, caption: text } : { text },
        { quoted: msg },
      );
    }

    // ── Full party canvas view ─────────────────────────────────────────────
    let buf = null;
    try {
      buf = await generatePartyCanvas(party, trainer.username);
    } catch (err) {
      console.error("[party canvas]", err?.message);
    }

    const CIRCLED = ["①","②","③","④","⑤","⑥"];
    const leadId  = trainer.leadPokemonId?.toString();
    const slots = party.map((p, i) => {
      const icon      = TYPE_EMOJIS[p.primaryType] || "⭐";
      const name      = `${p.displayName || p.name}${p.shiny ? " ✨" : ""}${p.nickname ? ` "${p.nickname}"` : ""}`;
      const isLead    = (p._id || p.id)?.toString() === leadId;
      const tags      = [isLead ? " ⚡LEAD" : "", p.isStarter ? " 🏅" : ""].filter(Boolean).join("");
      const currentXp = p.xp ?? p.exp ?? 0;
      const xpNeeded  = getPokemonXpNeeded(p.level);
      const xpText    = xpNeeded > 0 ? `\`${currentXp}/${xpNeeded}\`` : "`MAX`";
      const currentHp = Math.max(0, Number(p.hp) || 0);
      const statusText = currentHp <= 0 ? "𝗙𝗔𝗜𝗡𝗧𝗘𝗗" : "𝗔𝗟𝗜𝗩𝗘";
      return [
        `│ ├─ ${CIRCLED[i] || `${i + 1}.`} ${icon} *${name}*${tags}   𝗟𝘃. \`${p.level}\``,
        `│   ❤️ 𝗛𝗣 \`${currentHp}/${p.maxHp}\``,
        `│   ✨ 𝗫𝗣 ${xpText}`,
        `│   ⚡ 𝗦𝘁𝗮𝘁𝘂𝘀: ${statusText}`,
      ].join("\n");
    });

    const caption =
`╭─ ⚔️「 𝗣𝗔𝗥𝗧𝗬 \`${party.length}/6\` 」
${slots.join("\n")}
╰━━━━━━━━━━━━━━━━

✦ \`.party <1-6>\` — 𝗗𝗲𝘁𝗮𝗶𝗹𝗲𝗱 𝗦𝘁𝗮𝘁𝘀
✦ \`.swap <slot1> <slot2>\` — 𝗥𝗲𝗼𝗿𝗱𝗲𝗿
✦ \`.t2pc <name>\` — 𝗠𝗼𝘃𝗲 𝘁𝗼 𝗣𝗖
✦ \`.t2party <name>\` — 𝗕𝗿𝗶𝗻𝗴 𝗳𝗿𝗼𝗺 𝗣𝗖`;

    if (buf) {
      await sock.sendMessage(jid, { image: buf, caption }, { quoted: msg });
    } else {
      await sock.sendMessage(jid, { text: caption }, { quoted: msg });
    }
  },
};
