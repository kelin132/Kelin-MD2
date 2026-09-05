import { getTrainer, addToParty, addToPC } from "../../lib/pokemon/players.mjs";
import { buildPokemon, savePokemon, updatePokemon } from "../../lib/pokemon/pokemonDb.mjs";
import { fetchPokemon } from "../../lib/pokemon/api.mjs";

function parsePokemonNames(args) {
  return args.join(" ")
    .replace(/@[^\s]+/g, "")
    .replace(/[()]/g, "")
    .split(",")
    .flatMap((part) => part.trim().split(/\s+/))
    .map((name) => name.trim())
    .filter(Boolean);
}

export default {
  name: "setpokes",
  aliases: ["setpokemon", "restorepokes", "restorepokemon"],
  category: "pokemon",
  description: "Give multiple Pokémon to a trainer (owner/staff level 3)",
  usage: ".setpokes (pikachu,charizard,greninja) @user",
  cooldown: 5,

  async run({ sock, msg, sender, args, isOwner, staffLevel }) {
    const jid = msg.key.remoteJid;
    const reply = (text, extra = {}) => sock.sendMessage(jid, { text, ...extra }, { quoted: msg });

    if (!isOwner && Number(staffLevel || 0) < 3) {
      return reply("❌ This command is restricted to the bot owner, staff, and level 3 administrators.");
    }

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (!mentioned.length) {
      return reply("❌ Mention the trainer.\n\nUsage: *.setpokes (pikachu,charizard,greninja) @user*");
    }

    const names = parsePokemonNames(args);
    if (!names.length) {
      return reply("❌ Add one or more Pokémon names separated by commas.\n\nExample: *.setpokes (pikachu,charizard,greninja) @user*");
    }
    if (names.length > 30) return reply("❌ You can restore up to 30 Pokémon in one command.");

    const targetJid = mentioned[0];
    const trainer = await getTrainer(targetJid);
    if (!trainer) {
      return reply(`❌ @${targetJid.split("@")[0]} has not started their Pokémon journey yet.`, { mentions: [targetJid] });
    }

    const results = await Promise.all(names.map(async (query) => {
      try {
        const apiData = await fetchPokemon(query);
        return { query, apiData };
      } catch {
        return { query, error: true };
      }
    }));

    const valid = results.filter((result) => result.apiData);
    if (!valid.length) {
      return reply(`❌ None of these Pokémon could be found: ${names.join(", ")}`);
    }

    const partyCount = Array.isArray(trainer.party) ? trainer.party.length : 0;
    let partySlots = Math.max(0, 6 - partyCount);
    const granted = [];
    const missing = results.filter((result) => result.error).map((result) => result.query);

    for (const result of valid) {
      const inParty = partySlots > 0;
      const pokemon = buildPokemon(result.apiData, targetJid, 10, inParty);
      await savePokemon(pokemon);
      if (inParty) {
        await addToParty(targetJid, pokemon._id.toString());
        await updatePokemon(pokemon._id, { inParty: true });
        partySlots -= 1;
      } else {
        await addToPC(targetJid, pokemon._id.toString());
      }
      granted.push({ pokemon, inParty });
    }

    const partyAdded = granted.filter((item) => item.inParty).length;
    const pcAdded = granted.length - partyAdded;
    const namesText = granted.map(({ pokemon }) => pokemon.displayName || pokemon.name).join(", ");
    const missingText = missing.length ? `\n⚠️ Not found: ${missing.join(", ")}` : "";

    return reply(
`╭━━━〔 ✨ 𝐏𝐎𝐊𝐄́𝐌𝐎𝐍 𝐑𝐄𝐒𝐓𝐎𝐑𝐄𝐃 〕━━━╮
┃ 👤 Trainer :: @${targetJid.split("@")[0]}
┃
┃ 🎁 Added :: ${granted.length}
┃ 🎒 Party :: ${partyAdded}
┃ 📦 PC    :: ${pcAdded}
┃
┃ 🐾 ${namesText}${missingText}
╰━━━━━━━━━━━━━━━━━━━━╯`,
      { mentions: [targetJid] },
    );
  },
};

