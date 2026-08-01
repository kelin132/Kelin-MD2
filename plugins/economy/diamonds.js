import { getUser, saveUser, requireRegistration, addHistory } from "./database.js";

const DIAMOND_SELL_PRICE = 20_000_000; // $2,000,000 per diamond

export default {
  name: "diamonds",
  aliases: ["diamond", "gems", "gem"],
  category: "economy",
  cooldown: 5,
  description: "Check your Diamond balance or sell them for $2,000,000 each",
  usage: ".diamonds  |  .diamonds sell <amount|all>",

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });
    const user  = await getUser(sender);
    const sub   = (args[0] || "").toLowerCase();

    // ── SELL ─────────────────────────────────────────────────────────────────
    if (sub === "sell") {
      const owned = user.diamonds || 0;
      if (owned <= 0) return reply("❌ You have no Diamonds to sell.");

      const rawAmt = (args[1] || "all").toLowerCase();
      let qty;
      if (rawAmt === "all") {
        qty = owned;
      } else {
        qty = parseInt(rawAmt, 10);
        if (isNaN(qty) || qty <= 0) return reply("❌ Enter a valid amount. Example: *.diamonds sell 3*");
        if (qty > owned) return reply(`❌ You only have *${owned}* Diamond${owned === 1 ? "" : "s"}.`);
      }

      const payout = qty * DIAMOND_SELL_PRICE;
      user.diamonds = owned - qty;
      user.money    = (user.money || 0) + payout;

      await saveUser(sender, user);
      await addHistory(sender, "sell", payout, `Sold ${qty} Diamond${qty === 1 ? "" : "s"} for $${payout.toLocaleString()}`);

      return reply(
`💎 *DIAMOND SOLD!*

💎 Sold      : ${qty} Diamond${qty === 1 ? "" : "s"}
💵 Received  : *+$${payout.toLocaleString()}*
💰 Wallet    : $${user.money.toLocaleString()}
💎 Remaining : ${user.diamonds} Diamond${user.diamonds === 1 ? "" : "s"}`
      );
    }

    // ── BALANCE ───────────────────────────────────────────────────────────────
    const owned = user.diamonds || 0;
    return reply(
`💎 *DIAMONDS*

You have *${owned.toLocaleString()}* Diamond${owned === 1 ? "" : "s"}.

Diamonds are rare and cannot be bought.
Find them by digging, begging, and getting lucky in gambling commands.

💰 Sell price: *$20,000,000 each*
Use *.diamonds sell <amount|all>* to cash out.`
    );
  },
};
