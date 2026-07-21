// plugins/pets/petgift.js
// .petgift @user <petId> — Gift one of your pets to another user
import { getAllPets, getPetById, releasePet, createPet, countPets } from "../../lib/petDatabase.js";
import { PET_SPECIES } from "../../lib/petData.js";
import { getDb } from "../../lib/mongo.mjs";

const MAX_PETS = 5;

export default {
  name: "petgift",
  description: "Gift one of your pets to another user",
  category: "pets",
  usage: ".petgift @user <petId>",
  aliases: ["givepet", "sendpet"],
  cooldown: 10,

  async run({ sock, msg, args }) {
    const jid      = msg.key.remoteJid;
    const sender   = msg.key.participant || msg.key.remoteJid;
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

    if (!mentions.length) {
      return sock.sendMessage(jid, {
        text: `🎁 *PET GIFT*\n\nUsage: *.petgift @user <petId>*\n\nGet your pet IDs with *.pets*`,
      }, { quoted: msg });
    }

    const target = mentions[0];
    if (target === sender) {
      return sock.sendMessage(jid, {
        text: `❌ You can't gift a pet to yourself!`,
      }, { quoted: msg });
    }

    // petId is the last arg that isn't a mention
    const petIdFragment = args.find(a => !a.startsWith("@"));
    if (!petIdFragment) {
      return sock.sendMessage(jid, {
        text: `❌ Please provide a pet ID.\n\nUsage: *.petgift @user <petId>*\nGet IDs with *.pets*`,
      }, { quoted: msg });
    }

    // Find pet by partial ID match
    const myPets = await getAllPets(sender);
    const pet    = myPets.find(p => p.petId.startsWith(petIdFragment));
    if (!pet) {
      return sock.sendMessage(jid, {
        text: `❌ Pet not found. Use *.pets* to see your pet IDs.`,
      }, { quoted: msg });
    }

    // Check target's pet count
    const targetCount = await countPets(target);
    if (targetCount >= MAX_PETS) {
      return sock.sendMessage(jid, {
        text: `❌ That user already has the maximum of *${MAX_PETS} pets*!`,
      }, { quoted: msg });
    }

    // Transfer: change owner field directly
    const db = getDb();
    await db.collection("pets").updateOne(
      { petId: pet.petId },
      { $set: { owner: target, isActive: false } }
    );

    const targetNum = target.split("@")[0].split(":")[0];

    return sock.sendMessage(jid, {
      text: [
        `🎁 *PET GIFTED!*`,
        ``,
        `You gifted *${pet.name}* to @${targetNum}!`,
        ``,
        `🐾 Pet   : ${pet.name}`,
        `⭐ Level : ${pet.level}`,
        `📖 Species: ${PET_SPECIES[pet.species]?.name || pet.species}`,
        ``,
        `They can use *.pets* to see and activate it.`,
      ].join("\n"),
      mentions: [target],
    }, { quoted: msg });
  },
};
