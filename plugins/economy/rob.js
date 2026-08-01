import { getUser, saveUser, requireRegistration, isRegistered, addHistory } from "./database.js";

export default {
  name: "rob",
  description: "Rob another user — 55% success rate (45-min cooldown)",
  category: "economy",
  cooldown: 6,
  usage: ".rob @user",
  checkJail: true,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const targetJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
      || (args[0]?.match(/^[0-9]+$/) ? `${args[0]}@s.whatsapp.net` : null);

    if (!targetJid) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `❌ Mention someone to rob!\n📝 Usage: *.rob @user*`
      }, { quoted: msg });
    }

    if (sender === targetJid) {
      return sock.sendMessage(msg.key.remoteJid, { text: "❌ You can't rob yourself!" }, { quoted: msg });
    }

    if (!await isRegistered(targetJid)) {
      return sock.sendMessage(msg.key.remoteJid, { text: "❌ That player is not registered." }, { quoted: msg });
    }

    const robber = await getUser(sender);
    const now    = Date.now();
    const cd     = 45 * 60 * 1000;

    if (now - (robber.lastRob || 0) < cd) {
      const remaining = cd - (now - robber.lastRob);
      const minutes   = Math.floor(remaining / (60 * 1000));
      return sock.sendMessage(msg.key.remoteJid, {
        text: `⏰ *Escape Time!*\n\nHide for *${minutes}m* more.`
      }, { quoted: msg });
    }

    const target = await getUser(targetJid);

    // Check staff immunity — cannot be robbed
    if (target.staffImmunity) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `🛡️ *Rob Blocked!*\n\n*${target.name}* has staff immunity — they cannot be robbed.`
      }, { quoted: msg });
    }

    // Check rob charm — active charm blocks the attempt
    if (target.robShieldExpiry && target.robShieldExpiry > Date.now()) {
      const minsLeft = Math.ceil((target.robShieldExpiry - Date.now()) / 60000);
      return sock.sendMessage(msg.key.remoteJid, {
        text: `🧿 *Rob Blocked!*\n\n*${target.name}* is protected by a Rob Charm!\n⏳ Shield expires in *${minsLeft} min*.`
      }, { quoted: msg });
    }

    // Can only rob from cash (not bank or vault)
    if (target.money < 100) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `💸 *Target is broke!*\n\n${target.name} only has $${target.money} cash. Minimum $100 needed.`
      }, { quoted: msg });
    }

    const amount  = Math.min(10000, Math.floor(Math.random() * (target.money * 0.3)) + 100);
    const success = Math.random() > 0.45;

    robber.lastRob = now;

    if (success) {
      target.money -= amount;
      robber.money += amount;
      await saveUser(sender, robber);
      await saveUser(targetJid, target);
      await addHistory(sender,    "rob",        amount,  `Robbed ${target.name}`);
      await addHistory(targetJid, "rob_victim", -amount, `Robbed by ${robber.name}`);

      await sock.sendMessage(msg.key.remoteJid, {
        text:
`꧁━━〔 🦹 *S U C C E S S F U L  H E I S T!* 〕━━꧂

  「 *Clean getaway, shadow!* 」

  ━━━━━━━━━━━━━━━━━━━━━━━
  👤 *Target*    *${target.name}*
  💰 *Stolen*    *$${amount.toLocaleString()}*
  💵 *Balance*   *$${robber.money.toLocaleString()}*
  ━━━━━━━━━━━━━━━━━━━━━━━

  🌸 *Mission complete, ninja!* ⚔️

꧂━━━━━━━━━━━━━━━━━━━━━━━━━━━꧁`,
        mentions: [targetJid],
      }, { quoted: msg });
    } else {
      const fine   = Math.floor(amount * 0.7);
      robber.money = Math.max(0, robber.money - fine);
      await saveUser(sender, robber);
      await addHistory(sender, "rob", -fine, `Rob failed — fined $${fine.toLocaleString()}`);

      await sock.sendMessage(msg.key.remoteJid, {
        text:
`꧁━━〔 🚔 *C A U G H T!* 〕━━꧂

  「 *You got busted, criminal!* 」

  ━━━━━━━━━━━━━━━━━━━━━━━
  💸 *Fine*      *$${fine.toLocaleString()}*
  💵 *Balance*   *$${robber.money.toLocaleString()}*
  ━━━━━━━━━━━━━━━━━━━━━━━

  ⏳ *Lay low for 45 minutes...*

꧂━━━━━━━━━━━━━━━━━━━━━━꧁`
      }, { quoted: msg });
    }
  }
};
