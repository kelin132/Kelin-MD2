/**
 * .vault [deposit|withdraw|balance] [amount]
 * Vault is a protected savings account — cannot be robbed.
 * Deposits are free; withdrawals cost 5% fee.
 */
import { getUser, saveUser, requireRegistration, addHistory } from "./database.js";

export default {
  name: "vault",
  description: "Manage your secure vault (rob-proof savings)",
  category: "economy",
  usage: ".vault [deposit|withdraw|bal] [amount]",
  aliases: ["safe"],
  checkJail: true,

  async run({ sock, msg, args, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const sub    = (args[0] || "bal").toLowerCase();
    const user   = await getUser(sender);
    const jid    = msg.key.remoteJid;

    // ── Balance ───────────────────────────────────────────────────────────
    if (!args[0] || ["bal", "balance", "check"].includes(sub)) {
      return sock.sendMessage(jid, {
        text:
          `🏦 *Your Vault*\n\n` +
          `🔒 Vault Balance : $${(user.vault || 0).toLocaleString()}\n` +
          `💵 Cash          : $${user.money.toLocaleString()}\n\n` +
          `_Tip: Vault funds cannot be stolen by .rob_`
      }, { quoted: msg });
    }

    const amount = parseInt(args[1]);
    if (!amount || amount <= 0 || isNaN(amount)) {
      return sock.sendMessage(jid, { text: "❌ Usage: `.vault deposit 1000` or `.vault withdraw 500`" }, { quoted: msg });
    }

    // ── Deposit ───────────────────────────────────────────────────────────
    if (["deposit", "dep", "d"].includes(sub)) {
      if (user.money < amount) {
        return sock.sendMessage(jid, {
          text: `❌ Insufficient cash!\n\n💵 You have: $${user.money.toLocaleString()}`
        }, { quoted: msg });
      }
      user.money -= amount;
      user.vault  = (user.vault || 0) + amount;
      await saveUser(sender, user);
      await addHistory(sender, "vault_deposit", -amount, `Deposited $${amount.toLocaleString()} to vault`);

      return sock.sendMessage(jid, {
        text:
          `🔒 *Vault Deposit*\n\n` +
          `💰 Deposited : $${amount.toLocaleString()}\n` +
          `🏦 Vault     : $${user.vault.toLocaleString()}\n` +
          `💵 Cash Left : $${user.money.toLocaleString()}`
      }, { quoted: msg });
    }

    // ── Withdraw ──────────────────────────────────────────────────────────
    if (["withdraw", "with", "w"].includes(sub)) {
      if ((user.vault || 0) < amount) {
        return sock.sendMessage(jid, {
          text: `❌ Insufficient vault balance!\n\n🔒 Vault: $${(user.vault || 0).toLocaleString()}`
        }, { quoted: msg });
      }
      const fee      = Math.floor(amount * 0.05);
      const received = amount - fee;

      user.vault -= amount;
      user.money += received;
      await saveUser(sender, user);
      await addHistory(sender, "vault_withdraw", received, `Withdrew $${amount.toLocaleString()} from vault (fee: $${fee.toLocaleString()})`);

      return sock.sendMessage(jid, {
        text:
          `🔓 *Vault Withdrawal*\n\n` +
          `📤 Withdrawn : $${amount.toLocaleString()}\n` +
          `💸 Fee (5%)  : -$${fee.toLocaleString()}\n` +
          `💵 Received  : $${received.toLocaleString()}\n` +
          `🏦 Vault Left: $${user.vault.toLocaleString()}`
      }, { quoted: msg });
    }

    return sock.sendMessage(jid, {
      text: "❓ Usage: `.vault balance` | `.vault deposit <amount>` | `.vault withdraw <amount>`"
    }, { quoted: msg });
  }
};
