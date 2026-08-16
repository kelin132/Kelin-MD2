// Create a shareable website Pokémon battle room without changing the classic .ch flow.

import { getTrainer, pickLeadFromParty } from "../../lib/pokemon/players.mjs";
import { getTrainerParty } from "../../lib/pokemon/pokemonDb.mjs";
import { generateChallengeCanvas } from "../../lib/pokemon/challengeCanvas.mjs";
import { createWebBattleRoom, webBattleUrl } from "../../lib/webBattleRoom.mjs";

export default {
  name: "challengeWeb",
  aliases: ["cha"],
  description: "Create a Pokémon battle room on the AIDORU website",
  category: "pokemon",
  usage: ".cha @user  OR  reply to their message then .cha",

  async run({ sock, msg, sender, text }) {
    const chatJid = msg.key.remoteJid;
    const context = msg.message?.extendedTextMessage?.contextInfo;
    const mentionedJid = context?.mentionedJid?.[0] || null;
    const quotedSender =
      context?.participant ||
      msg.quoted?.key?.participant ||
      (msg.quoted?.key?.remoteJid !== chatJid ? msg.quoted?.key?.remoteJid : null);
    const targetJid = mentionedJid || quotedSender || null;

    if (!targetJid) {
      return sock.sendMessage(chatJid, {
        text: "Usage:\n• *.cha @user* — create a website battle room\n• Reply to their message then *.cha*",
      }, { quoted: msg });
    }

    if (targetJid === sender) {
      return sock.sendMessage(chatJid, { text: "❌ You can't challenge yourself!" }, { quoted: msg });
    }

    const challenger = await getTrainer(sender);
    const opponent = await getTrainer(targetJid);
    if (!challenger) {
      return sock.sendMessage(chatJid, { text: "❌ Start your journey first! Use *.startjourney*" }, { quoted: msg });
    }
    if (!opponent) {
      return sock.sendMessage(chatJid, { text: "❌ That trainer hasn't started their Pokémon journey yet!" }, { quoted: msg });
    }

    const [party, opponentParty] = await Promise.all([
      getTrainerParty(sender),
      getTrainerParty(targetJid),
    ]);
    const lead = pickLeadFromParty(challenger, party);
    const opponentLead = pickLeadFromParty(opponent, opponentParty);
    if (!lead || lead.hp <= 0) {
      return sock.sendMessage(chatJid, { text: "💔 All your Pokémon have fainted! Use *.heal* first." }, { quoted: msg });
    }
    if (!opponentLead || opponentLead.hp <= 0) {
      return sock.sendMessage(chatJid, { text: "💔 The challenged trainer has no healthy Pokémon! They should use *.heal* first." }, { quoted: msg });
    }

    let room;
    try {
      room = await createWebBattleRoom({
        challengerJid: sender,
        challengerName: challenger.username || msg.pushName || sender.split("@")[0],
        challengerAvatarUrl: await sock.profilePictureUrl(sender, "image").catch(() => null),
        challengerTrainer: challenger,
        challengerParty: party,
        opponentJid: targetJid,
        opponentName: opponent.username || targetJid.split("@")[0],
        opponentTrainer: opponent,
        opponentParty,
      });
    } catch (error) {
      console.error("[challengeWeb] website battle room unavailable:", error?.message || error);
      return sock.sendMessage(chatJid, { text: "❌ The website battle arena is temporarily unavailable. Try again shortly." }, { quoted: msg });
    }

    const [challengerAvatarUrl, opponentAvatarUrl] = await Promise.all([
      sock.profilePictureUrl(sender, "image").catch(() => null),
      sock.profilePictureUrl(targetJid, "image").catch(() => null),
    ]);

    let challengeImage = null;
    try {
      challengeImage = await generateChallengeCanvas({
        challenger: {
          name: challenger.username || msg.pushName || sender.split("@")[0],
          avatarUrl: challengerAvatarUrl,
        },
        opponent: {
          name: `@${targetJid.split("@")[0]}`,
          avatarUrl: opponentAvatarUrl,
        },
      });
    } catch {
      challengeImage = null;
    }

    const caption =
      `⚔️ *WEBSITE BATTLE CHALLENGE!*\n\n` +
      `*${challenger.username || msg.pushName || sender.split("@")[0]}* challenges @${targetJid.split("@")[0]} to an AIDORU Pokémon battle!\n\n` +
      `📦 Both players' party Pokémon have been forced into the same website battle room.\n` +
      `🌐 *Battle room:* ${webBattleUrl(room._id)}\n\n` +
      `Open the same link to enter this match. The challenger and challenged trainer will be placed on opposite sides automatically.`;

    if (challengeImage) {
      return sock.sendMessage(chatJid, { image: challengeImage, caption, mentions: [targetJid] }, { quoted: msg });
    }
    return sock.sendMessage(chatJid, { text: caption, mentions: [targetJid] }, { quoted: msg });
  },
};
