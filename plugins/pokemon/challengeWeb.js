// Create a shareable website Pokémon battle room without changing the classic .ch flow.

import { getTrainer, pickLeadFromParty } from "../../lib/pokemon/players.mjs";
import { getTrainerParty } from "../../lib/pokemon/pokemonDb.mjs";
import { generateChallengeCanvas } from "../../lib/pokemon/challengeCanvas.mjs";
import { createWebBattleRoom, webBattleUrl } from "../../lib/webBattleRoom.mjs";

export default {
  // Legacy implementation retained for reference only. The command is owned by
  // challengeArena.js so `.cha` can never dispatch two competing room flows.
  name: "challengeWebLegacy",
  aliases: [],
  description: "Legacy disabled website challenge implementation",
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

    const [challengerAvatarUrl, opponentAvatarUrl] = await Promise.all([
      sock.profilePictureUrl(sender, "image").catch(() => null),
      sock.profilePictureUrl(targetJid, "image").catch(() => null),
    ]);

    let room;
    try {
      room = await createWebBattleRoom({
        challengerJid: sender,
        challengerName: challenger.username || msg.pushName || sender.split("@")[0],
        challengerAvatarUrl,
        challengerTrainer: challenger,
        challengerParty: party,
        opponentJid: targetJid,
        opponentName: opponent.username || targetJid.split("@")[0],
        opponentAvatarUrl,
        opponentTrainer: opponent,
        opponentParty,
      });
    } catch (error) {
      console.error("[challengeWeb] website battle room unavailable:", error?.message || error);
      return sock.sendMessage(chatJid, { text: "❌ The website battle arena is temporarily unavailable. Try again shortly." }, { quoted: msg });
    }

    const arenaUrl = webBattleUrl(room._id);
    const roomCode = room.code || room._id.slice(-6).toUpperCase();
    const challengerName = challenger.username || msg.pushName || sender.split("@")[0];
    const opponentName = opponent.username || targetJid.split("@")[0];

    let challengeImage = null;
    try {
      challengeImage = await generateChallengeCanvas({
        challenger: {
          name: challengerName,
          avatarUrl: challengerAvatarUrl,
        },
        opponent: {
          name: `@${opponentName}`,
          avatarUrl: room.opponent?.avatarUrl || null,
        },
      });
    } catch {
      challengeImage = null;
    }

    const caption =
      `⚔️ *WEBSITE BATTLE CHALLENGE!*\n\n` +
      `*${challengerName}* challenges @${opponentName} to an AIDORU Pokémon battle!\n\n` +
      `📦 Both parties are loaded into the battle room.\n` +
      `🔐 *Room code:* \`${roomCode}\`\n` +
      `🌐 *Open the arena:* ${arenaUrl}\n\n` +
      `This link opens the live arena directly. You can also enter the code from the Pokémon Battle page.`;

    const directMessage =
      `⚔️ *AIDORU BATTLE ARENA*\n\n` +
      `${challengerName} vs ${opponentName}\n\n` +
      `Room code: *${roomCode}*\n` +
      `🌐 Open the arena directly:\n${arenaUrl}\n\n` +
      `Both trainers are already loaded. Open the link, sign in with your AIDORU account, and the match will start in the arena.`;

    // A group message is useful for context, but each trainer also receives the
    // direct arena URL so neither player has to hunt through the website lobby.
    for (const playerJid of new Set([sender, targetJid])) {
      if (playerJid === chatJid) continue;
      try {
        await sock.sendMessage(playerJid, { text: directMessage });
      } catch (error) {
        console.error("[challengeWeb] could not send direct arena link:", error?.message || error);
      }
    }

    if (challengeImage) {
      return sock.sendMessage(chatJid, { image: challengeImage, caption, mentions: [targetJid] }, { quoted: msg });
    }
    return sock.sendMessage(chatJid, { text: caption, mentions: [targetJid] }, { quoted: msg });
  },
};
