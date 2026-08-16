// plugins/pokemon/challengePlatform.js
// Create a shared AIDORU web battle room for a WhatsApp challenge.

import { findTrainerByUsername, getTrainer, pickLeadFromParty } from "../../lib/pokemon/players.mjs";
import { getTrainerParty } from "../../lib/pokemon/pokemonDb.mjs";
import { createWebBattleRoom, webBattleUrl } from "../../lib/webBattleRoom.mjs";
import { resolveLid } from "../../lib/permissions.mjs";

function normaliseLabel(value) {
  return String(value ?? "").trim().replace(/^@+/, "").toLowerCase();
}

function unwrapMessage(message) {
  let current = message || {};
  for (let index = 0; index < 5; index += 1) {
    const next =
      current.ephemeralMessage?.message ||
      current.viewOnceMessage?.message ||
      current.viewOnceMessageV2?.message ||
      current.viewOnceMessageV2Extension?.message;
    if (!next) break;
    current = next;
  }
  return current;
}

function getContextInfo(msg) {
  const message = unwrapMessage(msg.message);
  return (
    message.extendedTextMessage?.contextInfo ||
    message.imageMessage?.contextInfo ||
    message.videoMessage?.contextInfo ||
    message.audioMessage?.contextInfo ||
    message.documentMessage?.contextInfo ||
    message.buttonsResponseMessage?.contextInfo ||
    message.templateButtonReplyMessage?.contextInfo ||
    null
  );
}

function jidCandidates(jid) {
  const value = String(jid || "");
  if (!value) return [];
  const [local, domain] = value.split("@", 2);
  const bareLocal = (local || "").split(":", 1)[0];
  const candidates = [value];
  if (domain === "s.whatsapp.net" && bareLocal) {
    candidates.push(`${bareLocal}@s.whatsapp.net`);
  }
  return [...new Set(candidates)];
}

async function findTrainerForJid(jid) {
  for (const candidate of jidCandidates(jid)) {
    const trainer = await getTrainer(candidate);
    if (trainer) return trainer;
  }
  return null;
}

async function findGroupMemberByLabel(sock, chatJid, value) {
  const label = normaliseLabel(value);
  if (!label || !chatJid?.endsWith("@g.us")) return null;

  try {
    const metadata = await sock.groupMetadata(chatJid);
    const participant = metadata.participants?.find((entry) =>
      [entry.notify, entry.name, entry.vname, entry.displayName, entry.jid]
        .filter(Boolean)
        .some((name) => normaliseLabel(name) === label),
    );
    return participant?.id || participant?.jid || null;
  } catch {
    return null;
  }
}

export default {
  name: "challenge-platform",
  aliases: ["chp"],
  description: "Create a shared AIDORU web battle room for another trainer",
  category: "pokemon",
  usage: ".chp @user  OR  .chp <trainer username>  OR  reply to their message then .chp",

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;
    const ctx = getContextInfo(msg);
    const mentionedJid = ctx?.mentionedJid?.[0] || null;
    const quotedSender =
      ctx?.participant ||
      ctx?.quotedParticipant ||
      ctx?.quotedMessage?.key?.participant ||
      (msg.quoted?.key?.participant ?? null) ||
      (msg.quoted?.key?.remoteJid && msg.quoted.key.remoteJid !== jid
        ? msg.quoted.key.remoteJid
        : null);

    const rawTargetJid = mentionedJid || quotedSender || null;
    const resolvedRawTargetJid = rawTargetJid?.endsWith("@lid")
      ? await resolveLid(rawTargetJid, sock, jid).then((digits) =>
          digits ? `${digits}@s.whatsapp.net` : null,
        )
      : rawTargetJid;
    const typedLabel = !resolvedRawTargetJid ? args.join(" ") : "";
    const typedTarget = typedLabel ? await findTrainerByUsername(typedLabel) : null;
    const groupTarget = !resolvedRawTargetJid && !typedTarget
      ? await findGroupMemberByLabel(sock, jid, typedLabel)
      : null;
    const targetJid = resolvedRawTargetJid || typedTarget?.jid || groupTarget || null;

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
      findTrainerForJid(targetJid),
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
      const challengerJid = challenger.jid || sender;
      const opponentJid = opponent.jid || targetJid;
      room = await createWebBattleRoom({
        challengerJid,
        challengerName: challenger.username || msg.pushName || sender.split("@")[0],
        challengerAvatarUrl: await sock.profilePictureUrl(sender, "image").catch(() => null),
        challengerTrainer: challenger,
        challengerParty: party,
        opponentJid,
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
      `Both trainers should open the same link and sign in. The invited trainer is seated automatically and the battle starts as soon as they enter.`;

    return sock.sendMessage(
      jid,
      { text: caption, mentions: [targetJid] },
      { quoted: msg },
    );
  },
};

