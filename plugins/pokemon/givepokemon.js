// plugins/pokemon/givepokemon.js
// [Mod/Owner] Give a Pokémon to a user

import { getTrainer, addToParty, addToPC } from "../../lib/pokemon/players.mjs";
import { buildPokemon, savePokemon } from "../../lib/pokemon/pokemonDb.mjs";
import { fetchPokemon } from "../../lib/pokemon/api.mjs";

export default {
  name: "givepokemon",
  aliases: ["givepoke", "addpoke"],
  description: "[Mod/Owner] Give a specific Pokémon to a user",
  category: "pokemon",
  usage: ".givepokemon @user <pokemon> [level]",
  isMod: true,

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    if (!mentioned || mentioned.length === 0 || !args[1]) {
      return sock.sendMessage(jid, {
        text: "Usage: *.givepokemon @user <pokemon name or number> [level]*\nExample: `.givepokemon @user pikachu 25`",
      }, { quoted: msg });
    }

    const targetJid = mentioned[0];
    const pokemonQuery = args[1];
    const level = parseInt(args[2]) || 10;

    const target = await getTrainer(targetJid);
    if (!target) {
      return sock.sendMessage(jid, {
        text: `❌ @${targetJid.split("@")[0]} hasn't started their Pokémon journey yet!`,
        mentions: [targetJid],
      }, { quoted: msg });
    }

    let apiData;
    try {
      apiData = await fetchPokemon(pokemonQuery);
    } catch {
      return sock.sendMessage(jid, {
        text: `❌ Couldn't find Pokémon *${pokemonQuery}*. Check the name/number and try again.`,
      }, { quoted: msg });
    }

    const pokemon = buildPokemon(apiData, targetJid, level, false);
    await savePokemon(pokemon);

    const partyFull = (target.party || []).length >= 6;
    if (!partyFull) {
      await addToParty(targetJid, pokemon._id.toString());
      pokemon.inParty = true;
    } else {
      await addToPC(targetJid, pokemon._id.toString());
    }

    const dest = partyFull ? "📦 PC" : "🎒 Party";

    await sock.sendMessage(jid, {
      image: { url: apiData.imageUrl },
      caption:
`🎁 *POKÉMON GIFT!*

@${targetJid.split("@")[0]} received a *${pokemon.displayName}*!
📊 Level: ${level}
❤️ HP: ${pokemon.hp}/${pokemon.maxHp}
⚔️ Attack: ${pokemon.attack}
🛡️ Defense: ${pokemon.defense}
🏷️ Type: ${(apiData.types || []).join(" / ")}

Sent to: ${dest}`,
      mentions: [targetJid],
    }, { quoted: msg });
  },
};
