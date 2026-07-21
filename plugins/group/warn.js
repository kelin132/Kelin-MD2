// plugins/group/warn.js
// .warn @user [reason] — Strike system; auto-kick at 3 warnings
import { getDb } from "../../lib/mongo.mjs";

const MAX_WARNS = 3;

async function getWarns(groupJid, userJid) {
  const db  = getDb();
  const doc = await db.collection("warns").findOne({ _id: `${groupJid}:${userJid}` });
  return doc || { count: 0, warnings: [] };
}

async function addWarn(groupJid, userJid, by, reason) {
  const db  = getDb();
  const key = `${groupJid}:${userJid}`;
  const doc = await db.collection("warns").findOne({ _id: key }) || { count: 0, warnings: [] };
  const entry = { by, reason: reason || "No reason given", ts: new Date().toISOString() };
  await db.collection("warns").updateOne(
    { _id: key },
    { $set: { count: doc.count + 1, warnings: [...doc.warnings, entry] } },
    { upsert: true }
  );
  return doc.count + 1;
}

async function resetWarns(groupJid, userJid) {
  const db  = getDb();
  await db.collection("warns").deleteOne({ _id: `${groupJid}:${userJid}` });
}

export default {
  name: "warn",
  description: "Warn a user; auto-kick at 3 warnings",
  category: "group",
  usage: ".warn @user [reason]",
  aliases: ["strike"],
  cooldown: 3,
  isAdmin: true,

  async run({ sock, msg, args }) {
    const jid      = msg.key.remoteJid;
    const sender   = msg.key.participant || msg.key.remoteJid;
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

    if (!jid.endsWith("@g.us")) {
      return sock.sendMessage(jid, {
        text: `❌ This command can only be used in groups.`,
      }, { quoted: msg });
    }

    // .warn list @user
    if (args[0] === "list" || args[0] === "check") {
      const target = mentions[0];
      if (!target) {
        return sock.sendMessage(jid, {
          text: `❌ Mention a user: *.warn check @user*`,
        }, { quoted: msg });
      }
      const data   = await getWarns(jid, target);
      const tNum   = target.split("@")[0].split(":")[0];
      const list   = data.warnings.map((w, i) =>
        `${i + 1}. ${w.reason} — ${new Date(w.ts).toLocaleDateString()}`
      ).join("\n") || "None";
      return sock.sendMessage(jid, {
        text: [
          `⚠️ *Warnings for @${tNum}*`,
          ``,
          `Count: *${data.count}/${MAX_WARNS}*`,
          ``,
          list,
        ].join("\n"),
        mentions: [target],
      }, { quoted: msg });
    }

    // .warn reset @user
    if (args[0] === "reset" || args[0] === "clear") {
      const target = mentions[0];
      if (!target) {
        return sock.sendMessage(jid, {
          text: `❌ Mention a user: *.warn reset @user*`,
        }, { quoted: msg });
      }
      await resetWarns(jid, target);
      const tNum = target.split("@")[0].split(":")[0];
      return sock.sendMessage(jid, {
        text: `✅ Warnings cleared for @${tNum}.`,
        mentions: [target],
      }, { quoted: msg });
    }

    // .warn @user [reason]
    if (!mentions.length) {
      return sock.sendMessage(jid, {
        text: [
          `⚠️ *WARN SYSTEM*`,
          ``,
          `• *.warn @user [reason]* — warn a user`,
          `• *.warn check @user* — view warnings`,
          `• *.warn reset @user* — clear warnings`,
          ``,
          `Auto-kick triggers at *${MAX_WARNS} warnings*.`,
        ].join("\n"),
      }, { quoted: msg });
    }

    const target = mentions[0];
    if (target === sender) {
      return sock.sendMessage(jid, { text: `❌ You can't warn yourself.` }, { quoted: msg });
    }

    const reason   = args.filter(a => !a.startsWith("@")).join(" ") || "No reason given";
    const count    = await addWarn(jid, target, sender, reason);
    const tNum     = target.split("@")[0].split(":")[0];

    if (count >= MAX_WARNS) {
      await sock.sendMessage(jid, {
        text: [
          `🔨 *@${tNum} has been kicked!*`,
          ``,
          `Reached *${MAX_WARNS}/${MAX_WARNS}* warnings.`,
          `Last reason: ${reason}`,
        ].join("\n"),
        mentions: [target],
      }, { quoted: msg });
      await resetWarns(jid, target);
      try {
        await sock.groupParticipantsUpdate(jid, [target], "remove");
      } catch {
        await sock.sendMessage(jid, { text: `⚠️ Could not auto-kick. Make sure I'm an admin.` });
      }
      return;
    }

    return sock.sendMessage(jid, {
      text: [
        `⚠️ *WARNING ISSUED*`,
        ``,
        `👤 User   : @${tNum}`,
        `📝 Reason : ${reason}`,
        `🔢 Strikes: *${count}/${MAX_WARNS}*`,
        ``,
        count === MAX_WARNS - 1
          ? `⚠️ *One more warning = auto-kick!*`
          : `${MAX_WARNS - count} warning(s) until auto-kick.`,
      ].join("\n"),
      mentions: [target],
    }, { quoted: msg });
  },
};
