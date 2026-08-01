/**
 * .get <code>
 * Claim money using an owner-set code.
 *
 * Codes are created by the owner with .setget and stored in the
 * `get_codes` MongoDB collection. Each code has a set amount,
 * an expiry date, and an optional max-uses limit.
 * A user can only claim each code once.
 */

import { getUser, saveUser, checkLevelUp, requireRegistration, addHistory } from "./database.js";
import { getDb } from "../../lib/mongo.mjs";

const COLLECTION = "get_codes";

async function col() {
  const db = await getDb();
  return db.collection(COLLECTION);
}

export default {
  name:        "get",
  description: "Claim money using an owner-issued code",
  category:    "economy",
  usage:       ".get <code>",
  aliases:     ["claimcode", "redeem"],
  cooldown:    5,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid  = msg.key.remoteJid;
    const code = (args[0] || "").toUpperCase().trim();

    // ── No code provided ───────────────────────────────────────────────────
    if (!code) {
      return sock.sendMessage(jid, {
        text:
`╭━━━〔 🎁 𝑪𝑳𝑨𝑰𝑴 𝑪𝑶𝑫𝑬 💸 〕━━━╮
┃
┃ ✦ Redeem an owner-issued code
┃   to receive free money!
┃
┣━━━━━━━━━━━━━━━━━━━━
┃ 📌 Usage  › .get <code>
┃ 📌 Alias  › .redeem <code>
┣━━━━━━━━━━━━━━━━━━━━
┃ 👀 Watch for code drops
┃    from the owner!
╰━━━━━━━━━━━━━━━━━━━━╯
💸✨ Free Money Awaits ✨💸`
      }, { quoted: msg });
    }

    // ── Look up the code ───────────────────────────────────────────────────
    const doc = await (await col()).findOne({ _id: code });

    if (!doc) {
      return sock.sendMessage(jid, {
        text:
`╭━━━〔 ❌ 𝑰𝑵𝑽𝑨𝑳𝑰𝑫 𝑪𝑶𝑫𝑬 ❌ 〕━━━╮
┃
┃ ✦ Code not recognised!
┃
┣━━━━━━━━━━━━━━━━━━━━
┃ 🔑 Code   › ${code}
┃ ❓ Status › Not Found
┣━━━━━━━━━━━━━━━━━━━━
┃ • Double-check the code
┃ • Codes are case-insensitive
┃ • Stay active for new drops!
╰━━━━━━━━━━━━━━━━━━━━╯
🌸 Better luck next time! 🌸`
      }, { quoted: msg });
    }

    const now = Date.now();

    // ── Check expiry ───────────────────────────────────────────────────────
    if (doc.expiry < now) {
      const expStr = new Date(doc.expiry).toDateString();
      return sock.sendMessage(jid, {
        text:
`╭━━━〔 ⛔ 𝑪𝑶𝑫𝑬 𝑬𝑿𝑷𝑰𝑹𝑬𝑫 ⛔ 〕━━━╮
┃
┃ ✦ This code is no longer active.
┃
┣━━━━━━━━━━━━━━━━━━━━
┃ 🔑 Code    › ${code}
┃ 📅 Expired › ${expStr}
┣━━━━━━━━━━━━━━━━━━━━
┃ 👀 Watch for fresh codes
┃    from the owner!
╰━━━━━━━━━━━━━━━━━━━━╯
⏳✨ Too Late This Time ✨⏳`
      }, { quoted: msg });
    }

    // ── Check max uses ─────────────────────────────────────────────────────
    if (doc.maxUses !== null && doc.uses >= doc.maxUses) {
      return sock.sendMessage(jid, {
        text:
`╭━━━〔 🔒 𝑭𝑼𝑳𝑳𝒀 𝑪𝑳𝑨𝑰𝑴𝑬𝑫 🔒 〕━━━╮
┃
┃ ✦ Everyone has grabbed this one!
┃
┣━━━━━━━━━━━━━━━━━━━━
┃ 🔑 Code    › ${code}
┃ 🔢 Claims  › ${doc.uses}/${doc.maxUses}
┃ 📊 Status  › 『 MAXED OUT 』
┣━━━━━━━━━━━━━━━━━━━━
┃ 🔥 Stay alert for the
┃    next code drop!
╰━━━━━━━━━━━━━━━━━━━━╯
💨✨ Missed This One ✨💨`
      }, { quoted: msg });
    }

    // ── Check if already claimed ───────────────────────────────────────────
    if (doc.claimedBy?.includes(sender)) {
      return sock.sendMessage(jid, {
        text:
`╭━━━〔 ⚠️ 𝑨𝑳𝑹𝑬𝑨𝑫𝒀 𝑪𝑳𝑨𝑰𝑴𝑬𝑫 ⚠️ 〕━━━╮
┃
┃ ✦ You already redeemed this code!
┃
┣━━━━━━━━━━━━━━━━━━━━
┃ 🔑 Code   › ${code}
┃ 📌 Limit  › Once per user
┣━━━━━━━━━━━━━━━━━━━━
┃ 🔥 Watch for the next
┃    code from the owner!
╰━━━━━━━━━━━━━━━━━━━━╯
🌸✨ One Per Customer ✨🌸`
      }, { quoted: msg });
    }

    // ── Atomically record the claim (prevents race conditions) ────────────
    const result = await (await col()).findOneAndUpdate(
      {
        _id: code,
        expiry: { $gt: now },
        $or: [
          { maxUses: null },
          { $expr: { $lt: ["$uses", "$maxUses"] } },
        ],
        claimedBy: { $ne: sender },
      },
      {
        $inc:  { uses: 1 },
        $push: { claimedBy: sender },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return sock.sendMessage(jid, {
        text:
`╭━━━〔 ❌ 𝑪𝑳𝑨𝑰𝑴 𝑭𝑨𝑰𝑳𝑬𝑫 ❌ 〕━━━╮
┃
┃ ✦ Could not claim right now.
┃   The code may have just been
┃   fully redeemed. Try again!
╰━━━━━━━━━━━━━━━━━━━━╯
⚡ Please try again shortly ⚡`
      }, { quoted: msg });
    }

    // ── Credit the user ────────────────────────────────────────────────────
    const user     = await getUser(sender);
    const amount   = doc.amount;
    user.money    += amount;
    user.xp        = (user.xp || 0) + 50;

    const { leveled, newLevel } = checkLevelUp(user);

    await saveUser(sender, user);
    await addHistory(sender, "get", amount, `Claimed code ${code}`);

    const expStr      = new Date(doc.expiry).toDateString();
    const usesDisplay = doc.maxUses
      ? `${result.uses}/${doc.maxUses}`
      : `${result.uses}/∞`;

    let text =
`╭━━━〔 🎁 𝑪𝑶𝑫𝑬 𝑹𝑬𝑫𝑬𝑬𝑴𝑬𝑫 💰 〕━━━╮
┃
┃ ✦ Code accepted — money incoming!
┃
┃ 🔑 Code    ➜ 『 ${code} 』
┃
┣━━━━━━━━━━━━━━━━━━━━
┃ 💰 Received › $${amount.toLocaleString()}
┃ 🔮 XP Bonus › +50
┃ 💵 Balance  › $${user.money.toLocaleString()}
┣━━━━━━━━━━━━━━━━━━━━
┃ 📅 Expires  › ${expStr}
┃ 🔢 Claims   › ${usesDisplay}
┣━━━━━━━━━━━━━━━━━━━━
┃ 🎉 𝐒𝐔𝐂𝐂𝐄𝐒𝐒!!
┃ Your wallet has been credited!
╰━━━━━━━━━━━━━━━━━━━━╯
🌸✨ Money Secured ✨🌸`;

    if (leveled) {
      text += `\n\n╭━━━〔 🎊 𝑳𝑬𝑽𝑬𝑳 𝑼𝑷 🎊 〕━━━╮\n┃ ⚡ You are now Level ${user.level}!\n╰━━━━━━━━━━━━━━━━━━━━╯`;
    }

    await sock.sendMessage(jid, { text }, { quoted: msg });
  },
};
