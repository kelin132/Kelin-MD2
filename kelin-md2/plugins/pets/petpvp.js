// plugins/pets/petpvp.js
// .petpvp @user — Challenge another user's active pet to a PvP battle
import { getActivePet, awardExp } from "../../lib/petDatabase.js";
import { RARITIES } from "../../lib/petData.js";
import { getDb } from "../../lib/mongo.mjs";

const COOLDOWN_MS = 20 * 60 * 1000; // 20 minutes
const EXP_WIN     = 80;
const EXP_LOSE    = 20;

async function getCooldown(owner) {
  const db  = getDb();
  const doc = await db.collection("petpvp_cd").findOne({ _id: owner });
  return doc?.lastPvp || 0;
}
async function setCooldown(owner) {
  const db = getDb();
  await db.collection("petpvp_cd").updateOne(
    { _id: owner },
    { $set: { lastPvp: Date.now() } },
    { upsert: true }
  );
}

function simulateBattle(attacker, defender) {
  let aHp = attacker.maxHp;
  let dHp = defender.maxHp;
  const rounds = [];
  let turn = attacker.speed >= defender.speed ? "a" : "d";

  for (let i = 0; i < 20; i++) {
    if (turn === "a") {
      const dmg = Math.max(1, attacker.attack - Math.floor(defender.defense * 0.5) + Math.floor(Math.random() * 5));
      dHp -= dmg;
      rounds.push(`⚔️ *${attacker.name}* hits *${defender.name}* for *${dmg}* dmg! (${Math.max(0, dHp)} HP left)`);
    } else {
      const dmg = Math.max(1, defender.attack - Math.floor(attacker.defense * 0.5) + Math.floor(Math.random() * 5));
      aHp -= dmg;
      rounds.push(`⚔️ *${defender.name}* hits *${attacker.name}* for *${dmg}* dmg! (${Math.max(0, aHp)} HP left)`);
    }
    if (aHp <= 0 || dHp <= 0) break;
    turn = turn === "a" ? "d" : "a";
  }

  const attackerWon = aHp > 0 && dHp <= 0
    ? true
    : (dHp > 0 && aHp <= 0 ? false : aHp >= dHp);

  return { rounds: rounds.slice(0, 6), attackerWon };
}

export default {
  name: "petpvp",
  description: "Battle another user's active pet",
  category: "pets",
  usage: ".petpvp @user",
  aliases: ["petbattle2", "pvp"],
  cooldown: 5,

  async run({ sock, msg }) {
    const jid      = msg.key.remoteJid;
    const sender   = msg.key.participant || msg.key.remoteJid;
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

    if (!mentions.length) {
      return sock.sendMessage(jid, {
        text: `⚔️ *PET PVP*\n\nChallenge someone's pet!\nUsage: *.petpvp @user*`,
      }, { quoted: msg });
    }

    const opponent = mentions[0];
    if (opponent === sender) {
      return sock.sendMessage(jid, {
        text: `❌ You can't battle yourself!`,
      }, { quoted: msg });
    }

    // Cooldown check
    const lastPvp = await getCooldown(sender);
    const now     = Date.now();
    if (now - lastPvp < COOLDOWN_MS) {
      const remaining = COOLDOWN_MS - (now - lastPvp);
      const mins = Math.floor(remaining / 60_000);
      const secs = Math.floor((remaining % 60_000) / 1000);
      return sock.sendMessage(jid, {
        text: `⏰ PvP cooldown active! Wait *${mins}m ${secs}s*.`,
      }, { quoted: msg });
    }

    const myPet  = await getActivePet(sender);
    const oppPet = await getActivePet(opponent);

    if (!myPet) {
      return sock.sendMessage(jid, {
        text: `🐾 You don't have an active pet! Use *.adopt* first.`,
      }, { quoted: msg });
    }
    if (!oppPet) {
      const oppNum = opponent.split("@")[0].split(":")[0];
      return sock.sendMessage(jid, {
        text: `❌ @${oppNum} doesn't have an active pet!`,
        mentions: [opponent],
      }, { quoted: msg });
    }

    const oppNum = opponent.split("@")[0].split(":")[0];

    // Battle intro
    await sock.sendMessage(jid, {
      text: [
        `⚔️ *PET PVP BATTLE!*`,
        ``,
        `🐾 *${myPet.name}* (Lv.${myPet.level}) vs *${oppPet.name}* (Lv.${oppPet.level})`,
        ``,
        `🥊 Battle starting...`,
      ].join("\n"),
      mentions: [opponent],
    }, { quoted: msg });

    const { rounds, attackerWon } = simulateBattle(myPet, oppPet);
    const winner  = attackerWon ? myPet   : oppPet;
    const loser   = attackerWon ? oppPet  : myPet;
    const winOwner = attackerWon ? sender  : opponent;
    const loseOwner = attackerWon ? opponent : sender;

    await setCooldown(sender);
    await awardExp(winOwner,  winner.petId, EXP_WIN);
    await awardExp(loseOwner, loser.petId,  EXP_LOSE);

    return sock.sendMessage(jid, {
      text: [
        `⚔️ *BATTLE LOG*`,
        ``,
        rounds.join("\n"),
        ``,
        `🏆 *${winner.name} WINS!*`,
        ``,
        `✨ ${winner.name} gained *${EXP_WIN} EXP*`,
        `💔 ${loser.name} gained *${EXP_LOSE} EXP* (consolation)`,
      ].join("\n"),
      mentions: [sender, opponent],
    }, { quoted: msg });
  },
};
