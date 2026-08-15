// plugins/pokemon/challengePlatform.js
// Create a shared AIDORU web battle room for a WhatsApp challenge.

import { findTrainerByUsername, getTrainer, pickLeadFromParty } from "../../lib/pokemon/players.mjs";
import { getTrainerParty } from "../../lib/pokemon/pokemonDb.mjs";
import { createWebBattleRoom, webBattleUrl } from "../../lib/webBattleRoom.mjs";
import { resolveLid } from "../../lib/permissions.mjs";

export default {
  name: "challenge-platform",
  aliases: ["chp"],
  description: "Create a shared AIDORU web battle room for another trainer",
  category: "pokemon",
  usage: ".chp @user  OR  .chp <trainer username>  OR  reply to their message then .chp",

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const mentionedJid = ctx?.mentionedJid?.[0] || null;
    const quotedSender =
      ctx?.participant ||
      (msg.quoted?.key?.participant ?? null) ||
      (msg.quoted?.key?.remoteJid !== jid ? msg.quoted?.key?.remoteJid : null);

    const rawTargetJid = mentionedJid || quotedSender || null;
    const resolvedRawTargetJid = rawTargetJid?.endsWith("@lid")
      ? await resolveLid(rawTargetJid, sock, jid).then((digits) =>
          digits ? `${digits}@s.whatsapp.net` : null,
        )
      : rawTargetJid;
    const typedTarget = !resolvedRawTargetJid
      ? await findTrainerByUsername(args.join(" "))
      : null;
    const targetJid = resolvedRawTargetJid || typedTarget?.jid || null;

    if (!targetJid) {
      return sock.sendMessage(
        jid,
        {
          text:
            "Usage:\n" +
            "• *.chp @user* — create a web battle room for that trainer\n" +
            "• *.chp <trainer username>* — create a room by trainer username\n" +
            "• Reply to their message then *.chp*",
        },
        { quoted: msg },
      );
    }

    const sameTrainer =
      targetJid === sender ||
      targetJid.split("@")[0].split(":")[0] === sender.split("@")[0].split(":")[0];
    if (sameTrainer) {
      return sock.sendMessage(jid, { text: "❌ You can't challenge yourself!" }, { quoted: msg });
    }

    const challenger = await getTrainer(sender);
    if (!challenger) {
      return sock.sendMessage(
        jid,
        { text: "❌ Start your journey first! Use *.startjourney*" },
        { quoted: msg },
      );
    }

    const [opponent, party] = await Promise.all([
      getTrainer(targetJid),
      getTrainerParty(sender),
    ]);
    if (!opponent) {
      return sock.sendMessage(
        jid,
        { text: "❌ That trainer hasn't started their Pokémon journey yet!" },
        { quoted: msg },
      );
    }

    const lead = pickLeadFromParty(challenger, party);
    if (!lead || lead.hp <= 0) {
      return sock.sendMessage(
        jid,
        { text: "💔 All your Pokémon have fainted! Use *.heal* first." },
        { quoted: msg },
      );
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
      });
    } catch (error) {
      console.error("[chp] website battle room unavailable:", error?.message || error);
      return sock.sendMessage(
        jid,
        { text: "❌ I couldn't open the web battle room right now. Please try *.chp* again." },
        { quoted: msg },
      );
    }

    const url = webBattleUrl(room._id);
    const caption =
      `🌐 *WEB BATTLE ROOM READY!*\n\n` +
      `*${challenger.username || msg.pushName || sender.split("@")[0]}* challenged @${targetJid.split("@")[0]}!\n\n` +
      `Open this link to enter the live AIDORU battle arena:\n${url}\n\n` +
      `Both trainers should open the link, sign in, and press *Ready up*. The battle starts automatically when both are ready.`;

    return sock.sendMessage(
      jid,
      { text: caption, mentions: [targetJid] },
      { quoted: msg },
    );
  },
};

