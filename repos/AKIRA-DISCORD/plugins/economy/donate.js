/**
 * .donate @user <amount>
 * Give money to another registered player.
 * Supports: @mention, reply to message, or phone number.
 * Aliases: gift, give, givemoney
 */
import { getUser, saveUser, requireRegistration, isRegistered, addHistory } from "./database.js";
import { parseAmount } from "./parseAmount.js";
import { formatWalletTransfer } from "./walletMessage.js";

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

export default {
  name: "donate",
  description: "Give money to another player",
  category: "economy",
  usage: ".donate @user <amount>  OR  reply to their message: .donate <amount>",
  aliases: ["gift", "give", "givemoney"],
  cooldown: 6,
  checkJail: true,

  async run({ sock, msg, args, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    // ── Resolve target (mention or reply) ──────────────────────────────────
    let targetJid = resolveTarget(msg);

    // Fallback: first arg that looks like a phone number
    if (!targetJid) {
      const numArg = args.find(a => /^[0-9]{5,}$/.test(a));
      if (numArg) targetJid = `${numArg}@s.whatsapp.net`;
    }

    if (!targetJid) {
      return reply(
        "❌ *Usage:* `.donate @user <amount>`\n\n" +
        "You can:\n" +
        "• Mention the person: *.donate @user 500*\n" +
        "• Reply to their message: *.donate 500*"
      );
    }

    if (targetJid === sender) {
      return reply("❌ You can't donate to yourself!");
    }

    // ── Parse amount ───────────────────────────────────────────────────────
    // Amount is the last argument. Supports 25k, 2.5m, 1b, and 1t.
    const amount = parseAmount(args[args.length - 1], 0);

    if (!amount || amount <= 0 || isNaN(amount)) {
      return reply("❌ Please provide a valid amount.\nExamples: *.give @user 500* or *.give @user 25k*");
    }

    // ── Checks ─────────────────────────────────────────────────────────────
    const giver = await getUser(sender);

    if (giver.money < amount) {
      return reply(`❌ You don't have enough cash!\n\n💰 Your balance: $${giver.money.toLocaleString()}`);
    }

    if (!await isRegistered(targetJid)) {
      return reply("❌ That player is not registered in the economy system.");
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
  },
};
