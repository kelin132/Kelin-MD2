/**
 * KELIN MD — .allreset
 * Reset ALL registered players' economy money to a chosen amount.
 * Resets: wallet (money), bank, vault, and cancels any active investment.
 * Owner only.
 * Usage: .allreset <amount>
 */
import { getDb } from "../../lib/mongo.mjs";

export default {
  name: "allreset",
  description: "Reset everyone's wallet, bank, vault & investments to a set amount (owner only)",
  category: "staff",
  usage: ".allreset <amount>",
  aliases: ["resetall", "economyreset"],
  isStaff: true,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;

    const rawAmount = args[0];
    if (!rawAmount) {
      return sock.sendMessage(jid, {
        text:
`💰 *ALLRESET — Full Economy Reset*

Resets *every registered player's* economy to the amount you choose.

This resets:
  💰 Wallet (money)
  🏦 Bank
  🔒 Vault
  📈 Active investment (cancelled, no payout)

Usage: *.allreset <amount>*
Example: *.allreset 1000* — sets everyone to $1,000 everywhere
Example: *.allreset 0*    — wipes all economy balances to $0

⚠️ *This affects ALL players instantly. Use with care.*`,
      }, { quoted: msg });
    }

    const amount = parseInt(rawAmount.replace(/[^0-9]/g, ""), 10);

    if (isNaN(amount) || amount < 0) {
      return sock.sendMessage(jid, {
        text: "❌ Invalid amount. Enter a number ≥ 0.\n\nExample: *.allreset 1000*",
      }, { quoted: msg });
    }

    // Confirmation step — require ".allreset <amount> confirm" to execute
    const confirmed = args[1]?.toLowerCase() === "confirm";
    if (!confirmed) {
      return sock.sendMessage(jid, {
        text:
`⚠️ *Confirm Full Economy Reset*

You are about to set *every registered player's* balances to *$${amount.toLocaleString()}*:
  💰 Wallet  → $${amount.toLocaleString()}
  🏦 Bank    → $${amount.toLocaleString()}
  🔒 Vault   → $${amount.toLocaleString()}
  📈 Active investments will be *cancelled*

To confirm, type:
  *.allreset ${amount} confirm*

❌ To cancel, simply ignore this message.`,
      }, { quoted: msg });
    }

    // Perform bulk update — reset wallet, bank, vault, and wipe active investment
    const db = await getDb();
    const result = await db.collection("users").updateMany(
      { registered: true },
      {
        $set: {
          money:  amount,
          bank:   amount,
          vault:  amount,
          activeInvestment: null,
        },
      }
    );

    // Reset treasury for all guilds that already exist — no upsert
    const guildResult = await db.collection("guilds").updateMany(
      {},
      { $set: { treasury: 0 } }
    );

    return sock.sendMessage(jid, {
      text:
`✅ *Full Economy Reset Complete*

  💰 Wallet  : *$${amount.toLocaleString()}*
  🏦 Bank    : *$${amount.toLocaleString()}*
  🔒 Vault   : *$${amount.toLocaleString()}*
  📈 Investments : *Cleared*
  🏰 Guilds  : *Treasury wiped to $0*

👥 Players updated : *${result.modifiedCount.toLocaleString()}*
⚔️ Guilds updated  : *${guildResult.modifiedCount.toLocaleString()}*`,
    }, { quoted: msg });
  },
};
