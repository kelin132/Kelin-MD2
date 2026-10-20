/**
 * .donate @user <amount>
 * Give money to another registered player.
 * Supports: @mention, reply to message, or phone number.
 * Aliases: gift, give, givemoney
 */
import { getUser, saveUser, requireRegistration, isRegistered, addHistory } from "./database.js";
import { parseAmount } from "./parseAmount.js";
import { formatWalletTransfer } from "./walletMessage.js";
import { normalizeJid, resolveAndMigrateIdentity } from "../../lib/identity.mjs";
import { hasActiveBidder, withBidderLock } from "../../lib/auctionManager.mjs";
import { hasActiveAuctionHolds } from "../../lib/auctionHolds.mjs";

function resolveTarget(msg) {
  // 1. Direct @mention
  const ctx = msg.message?.extendedTextMessage?.contextInfo
            || msg.message?.imageMessage?.contextInfo
            || msg.message?.videoMessage?.contextInfo
            || {};
  if (ctx?.mentionedJid?.[0]) return ctx.mentionedJid[0];
  // 2. Reply to a message (quoted participant)
  if (ctx?.participant)         return ctx.participant;
  if (ctx?.quotedParticipant)   return ctx.quotedParticipant;
  return null;
}

function phoneFromArgs(args) {
  const tokens = (Array.isArray(args) ? args : []).map((arg) => String(arg || ""));
  const amountIsLastToken = tokens.length > 1 && parseAmount(tokens.at(-1), 0) > 0;
  const usable = amountIsLastToken ? tokens.slice(0, -1) : tokens;

  for (let start = 0; start < usable.length; start++) {
    let digits = "";
    for (let index = start; index < usable.length; index++) {
      const part = usable[index].replace(/\D/g, "");
      if (!part || part.length > 15 || digits.length + part.length > 15) break;
      digits += part;
      if (digits.length >= 7 && (index === usable.length - 1 || digits.length === 15)) {
        return `${digits}@s.whatsapp.net`;
      }
      // Only join short groups split by formatting spaces; do not absorb words.
      if (!/^\+?\s*\d[\d\s().-]*$/.test(usable[index])) break;
    }
  }
  return "";
}

export default {
  name: "give",
  description: "Give money to another player",
  category: "economy",
  usage: ".donate @user <amount>  OR  reply to their message: .donate <amount>",
  aliases: ["gift", "give", "givemoney","donate"],
  cooldown: 6,
  checkJail: true,

  async run({ sock, msg, args, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    // ── Resolve target (mention or reply) ──────────────────────────────────
    const rawTargetJid = resolveTarget(msg);
    const context = msg.message?.extendedTextMessage?.contextInfo
      || msg.message?.imageMessage?.contextInfo
      || msg.message?.videoMessage?.contextInfo
      || {};
    const alternateTargetJid = context.mentionedJidAlt?.[0]
      || context.participantAlt
      || "";
    let targetJid = rawTargetJid;
    if (rawTargetJid) {
      const targetLid = rawTargetJid.endsWith("@lid")
        ? rawTargetJid
        : alternateTargetJid.endsWith("@lid")
          ? alternateTargetJid
          : "";
      if (targetLid) {
        const targetPhone = rawTargetJid.endsWith("@lid")
          ? alternateTargetJid
          : rawTargetJid;
        try {
          // Mention/quoted context is message content, not authenticated sender
          // metadata. Verify the recipient with Baileys or group metadata.
          targetJid = await resolveAndMigrateIdentity(targetLid, sock, jid);
        } catch {
          targetJid = normalizeJid(targetPhone || rawTargetJid);
        }
      } else {
        targetJid = normalizeJid(rawTargetJid);
      }
    }

    // Fallback: search for a phone number argument
    if (!targetJid) {
      targetJid = phoneFromArgs(args);
    }

    if (!targetJid) {
      return reply("❌ Please mention a user, reply to their message, or specify a phone number.\nUsage: `.donate @user <amount>`");
    }

    if (targetJid === sender) {
      return reply("❌ You can't donate to yourself!");
    }

    // ── Parse amount ───────────────────────────────────────────────────────
    // Check args from right to left for the first valid numeric amount
    let rawAmount;
    for (let i = args.length - 1; i >= 0; i--) {
      const parsed = parseAmount(args[i], 0);
      if (parsed > 0) {
        rawAmount = parsed;
        break;
      }
    }

    const amount = rawAmount;

    if (!amount || amount <= 0 || isNaN(amount)) {
      return reply("❌ Please provide a valid amount.\nExamples: *.give @user 500* or *.give @user 25k*");
    }

    if (!await isRegistered(targetJid)) {
      return reply("❌ That player is not registered in the economy system.");
    }

    return withBidderLock(sender, async () => {
    // ── Checks ─────────────────────────────────────────────────────────────
    const giver = await getUser(sender);
    if (hasActiveBidder(sender) || hasActiveAuctionHolds(giver)) {
      return reply("❌ You can't transfer money while you hold the highest auction bid. You can transfer again if you're outbid or after the auction ends.");
    }

    if (giver.money < amount) {
      return reply(`❌ You don't have enough cash!\n\n💰 Your balance: $${giver.money.toLocaleString()}`);
    }

    const receiver = await getUser(targetJid);

    // ── Transfer ───────────────────────────────────────────────────────────
    giver.money    -= amount;
    receiver.money += amount;

    await saveUser(sender, giver);
    await saveUser(targetJid, receiver);
    await addHistory(sender,    "donate_out", -amount, `Donated $${amount.toLocaleString()} to ${receiver.name}`);
    await addHistory(targetJid, "donate_in",   amount, `Received $${amount.toLocaleString()} from ${giver.name}`);

    await sock.sendMessage(jid, {
      text: formatWalletTransfer({
        action: "DONATION SENT",
        amount,
        senderJid: sender,
        targetJid,
        receiverName: receiver.name,
        balance: giver.money,
      }),
      mentions: [sender, targetJid],
    }, { quoted: msg });
    });
  },
};
