// plugins/naruto/ngive.js
// Owner command — Give, set, or take Ryo from a user's ninja wallet
// Usage: .ngive @user <amount>       — add ryo
//        .ngivetake @user <amount>   — remove ryo
//        .ngiveall <amount>          — give all players ryo
//        .nsetmoney @user <amount>   — set ryo to exact amount

import players from "../../lib/naruto/players.js";

export default {
  name: "ngive",
  description: "Give/set/take Ryo from a ninja (owner only)",
  category: "naruto",
  usage: ".ngive @user <amount> | .ngivetake @user <amount> | .nsetmoney @user <amount> | .ngiveall <amount>",
  aliases: ["ngiveryo", "ngivetake", "nsetmoney", "ngiveall"],
  cooldown: 3,
  isOwner: true,

  async run({ sock, msg, cmd, args, sender, text }) {
    const jid = msg.key.remoteJid;

    // ── .ngiveall <amount> — give all players the same ryo
    if (cmd === "ngiveall") {
      const amount = parseInt(args[0]);
      if (isNaN(amount) || amount === 0) {
        return sock.sendMessage(jid, {
          text: "❌ Usage: *.ngiveall <amount>*\nExample: .ngiveall 500"
        }, { quoted: msg });
      }

      const allPlayers = await players.getAll();
      if (!allPlayers.length) {
        return sock.sendMessage(jid, { text: "❌ No ninja profiles found." }, { quoted: msg });
      }

      let updated = 0;
      for (const p of allPlayers) {
        p.ryo = Math.max(0, (p.ryo || 0) + amount);
        await p.save();
        updated++;
      }

      const action = amount >= 0 ? `gave +${amount}` : `took ${Math.abs(amount)}`;
      return sock.sendMessage(jid, {
        text: `✅ *${action} Ryo* to all *${updated} ninja profiles*.`
      }, { quoted: msg });
    }

    // ── All other subcommands need a target user
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const targetJid =
      ctx?.mentionedJid?.[0] ||
      ctx?.participant ||
      null;

    if (!targetJid) {
      return sock.sendMessage(jid, {
        text:
`❌ Please @mention or reply to a user.

*Commands:*
• *.ngive @user <amount>* — add Ryo
• *.ngivetake @user <amount>* — remove Ryo
• *.nsetmoney @user <amount>* — set exact Ryo balance
• *.ngiveall <amount>* — give everyone the same amount`
      }, { quoted: msg });
    }

    const tag = `@${targetJid.split("@")[0]}`;

    // Parse amount — first numeric arg that isn't the mention
    const amountArg = args.find(a => /^-?\d+$/.test(a));
    const amount = amountArg ? parseInt(amountArg) : NaN;

    if (isNaN(amount)) {
      return sock.sendMessage(jid, {
        text: `❌ Provide a valid amount.\nExample: *.${cmd} @user 1000*`
      }, { quoted: msg });
    }

    const player = await players.get(targetJid);
    if (!player) {
      return sock.sendMessage(jid, {
        text: `❌ ${tag} doesn't have a ninja profile.`,
        mentions: [targetJid]
      }, { quoted: msg });
    }

    const before = player.ryo;

    // ── .nsetmoney — set exact balance
    if (cmd === "nsetmoney") {
      if (amount < 0) {
        return sock.sendMessage(jid, { text: "❌ Amount must be 0 or more for .nsetmoney." }, { quoted: msg });
      }
      player.ryo = amount;
      await player.save();
      return sock.sendMessage(jid, {
        text: `✅ *Set ${tag}'s Ryo to ${amount}*\n\nPrevious: ${before} Ryo\nNew balance: ${player.ryo} Ryo`,
        mentions: [targetJid]
      }, { quoted: msg });
    }

    // ── .ngivetake — remove ryo
    if (cmd === "ngivetake") {
      player.ryo = Math.max(0, player.ryo - Math.abs(amount));
      await player.save();
      return sock.sendMessage(jid, {
        text: `✅ *Took ${Math.abs(amount)} Ryo from ${tag}*\n\nPrevious: ${before} Ryo\nNew balance: ${player.ryo} Ryo`,
        mentions: [targetJid]
      }, { quoted: msg });
    }

    // ── .ngive / .ngiveryo — add ryo
    player.ryo = Math.max(0, player.ryo + amount);
    await player.save();
    const action = amount >= 0 ? `gave +${amount}` : `took ${Math.abs(amount)}`;
    return sock.sendMessage(jid, {
      text: `✅ *${action} Ryo ${amount >= 0 ? "to" : "from"} ${tag}*\n\nPrevious: ${before} Ryo\nNew balance: ${player.ryo} Ryo`,
      mentions: [targetJid]
    }, { quoted: msg });
  }
};
