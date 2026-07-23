// plugins/pokemon/giftpoke.js
// Give one of your own party Pokémon to another user

import {
  getTrainer, updateTrainer,
  addToParty, addToPC,
  removeFromParty, removeFromPC,
} from "../../lib/pokemon/players.mjs";
import { getTrainerParty, getPokemon, updatePokemon } from "../../lib/pokemon/pokemonDb.mjs";

export default {
  name: "giftpoke",
  aliases: ["givepoke", "sendpoke", "tradegive"],
  description: "Give one of your party Pokémon to another trainer",
  category: "pokemon",
  usage: ".giftpoke @user <party slot 1-6>",
  cooldown: 30,

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

    // Show usage if missing args
    if (mentioned.length === 0 || !args[1]) {
      return sock.sendMessage(jid, {
        text:
`Usage: *.giftpoke @user <slot>*

Example: \`.giftpoke @user 2\` — gives your slot-2 Pokémon to that trainer.

Type *.party* to see your party slots.`,
      }, { quoted: msg });
    }

    const targetJid = mentioned[0];
    const slotNum   = parseInt(args[1]);

    if (sender === targetJid) {
      return sock.sendMessage(jid, { text: "❌ You can't gift a Pokémon to yourself!" }, { quoted: msg });
    }

    if (isNaN(slotNum) || slotNum < 1 || slotNum > 6) {
      return sock.sendMessage(jid, {
        text: "❌ Invalid slot! Choose between *1* and *6*.\nType *.party* to see your slots.",
      }, { quoted: msg });
    }

    // Load sender's trainer & party
    const senderTrainer = await getTrainer(sender);
    if (!senderTrainer) {
      return sock.sendMessage(jid, { text: "❌ Start your journey first! Use *.startjourney*" }, { quoted: msg });
    }

    const party = await getTrainerParty(sender);
    if (!party || party.length === 0) {
      return sock.sendMessage(jid, { text: "❌ Your party is empty!" }, { quoted: msg });
    }

    if (party.length === 1) {
      return sock.sendMessage(jid, {
        text: "❌ You can't give away your last Pokémon!",
      }, { quoted: msg });
    }

    if (slotNum > party.length) {
      return sock.sendMessage(jid, {
        text: `❌ You only have *${party.length}* Pokémon in your party. Choose slot 1–${party.length}.`,
      }, { quoted: msg });
    }

    const pokemonToGift = party[slotNum - 1];
    if (!pokemonToGift) {
      return sock.sendMessage(jid, { text: "❌ No Pokémon found in that slot!" }, { quoted: msg });
    }

    const pokeName = pokemonToGift.displayName || pokemonToGift.name;
    const pokeId   = (pokemonToGift._id || pokemonToGift.id)?.toString();

    // Check keystone — can't send a Pokémon holding the keystone
    if (senderTrainer.keystoneEquippedTo === pokeId) {
      return sock.sendMessage(jid, {
        text: `❌ *${pokeName}* is holding your Key Stone!\nUnequip it first: *.unequip ${pokeName.toLowerCase()}*`,
      }, { quoted: msg });
    }

    // Load recipient's trainer
    const recipientTrainer = await getTrainer(targetJid);
    if (!recipientTrainer) {
      return sock.sendMessage(jid, {
        text: `❌ @${targetJid.split("@")[0]} hasn't started their Pokémon journey yet!`,
        mentions: [targetJid],
      }, { quoted: msg });
    }

    // Move the Pokémon
    // 1. Remove from sender's party & PC lists
    await removeFromParty(sender, pokeId);
    await removeFromPC(sender, pokeId);

    // 2. Update the Pokémon's owner in DB
    await updatePokemon(pokemonToGift._id, { owner: targetJid });

    // 3. Add to recipient's party or PC
    const recipientPartyFull = (recipientTrainer.party || []).length >= 6;
    if (!recipientPartyFull) {
      await addToParty(targetJid, pokeId);
    } else {
      await addToPC(targetJid, pokeId);
    }

    const dest        = recipientPartyFull ? "📦 PC" : "🎒 Party";
    const senderName  = senderTrainer.username || msg.pushName || "Trainer";
    const recipName   = recipientTrainer.username || targetJid.split("@")[0];

    await sock.sendMessage(jid, {
      text:
`🎁 *POKÉMON GIFTED!*

*${senderName}* gave *${pokeName}* to @${targetJid.split("@")[0]}!

🐉 *${pokeName}* Lv.${pokemonToGift.level}
❤️ HP: ${pokemonToGift.hp}/${pokemonToGift.maxHp}
⚔️ Attack: ${pokemonToGift.attack}
🛡️ Defense: ${pokemonToGift.defense}

Sent to: ${dest}`,
      mentions: [targetJid],
    }, { quoted: msg });
  },
};
