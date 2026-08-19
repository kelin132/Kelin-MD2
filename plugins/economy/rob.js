import { getUser, saveUser, requireRegistration, isRegistered, addHistory } from "./database.js";
import { hasActiveGun } from "../../lib/economySecurity.mjs";

function fmt(n) {
  if (n >= 1e9) return `$${(n/1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n/1e3).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

export default {
  name: "rob",
  description: "Rob another user — 55% success rate (45-min cooldown)",
  category: "economy",
  cooldown: 6,
  usage: ".rob @user",
  checkJail: true,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid = msg.key.remoteJid;

    const targetJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
      || (args[0]?.match(/^[0-9]+$/) ? `${args[0]}@s.whatsapp.net` : null);

    if (!targetJid) {
      return sock.sendMessage(jid, {
        text:
`╭─❀「 🦹 *𝐑𝐎𝐁* 」❀─╮
│ 📖 *Usage*   :: *.rob @user*
│ 🎯 *Rate*    :: *55% success*
│ 💸 *Risk*    :: *Fine if caught*
│ 🔫 *Gun*      :: *Required from .shop weapons*
│ ⏳ *Cooldown* :: *45 minutes*
╰───────────────❀`
      }, { quoted: msg });
    }

    if (sender === targetJid) {
      return sock.sendMessage(jid, { text: "❌ You can't rob yourself!" }, { quoted: msg });
    }

    if (!await isRegistered(targetJid)) {
      return sock.sendMessage(jid, { text: "❌ That player is not registered." }, { quoted: msg });
    }

    const robber = await getUser(sender);
    const now    = Date.now();

    if (!hasActiveGun(robber, now)) {
      return sock.sendMessage(jid, {
        text:
`╭─❀「 🦹 *𝐑𝐎𝐁* 」❀─╮
│ ❌ *Result*  :: *NO GUN 🔴*
│
│ 🔫 Buy a gun from *.shop weapons* before robbing.
│ ⏳ A gun remains active for *3 days*.
╰───────────────❀`
      }, { quoted: msg });
    }

    const cd     = 45 * 60 * 1000;

    if (now - (robber.lastRob || 0) < cd) {
      const remaining = cd - (now - robber.lastRob);
      const minutes   = Math.floor(remaining / (60 * 1000));
      return sock.sendMessage(jid, {
        text:
`╭─❀「 🦹 *𝐑𝐎𝐁* 」❀─╮
│ ⏳ *Result*  :: *HIDING 🔴*
│ 🍃 *Flavour* :: _身を隠せ！警察が来るぞ！_
│
│ 🕐 *Next*    :: *${minutes}m remaining*
│
│ 😤 *Lay low for now...*
╰───────────────❀`
      }, { quoted: msg });
    }

    const target = await getUser(targetJid);

    // Check staff immunity — cannot be robbed
    if (target.staffImmunity) {
      return sock.sendMessage(jid, {
        text:
`╭─❀「 🦹 *𝐑𝐎𝐁* 」❀─╮
│ 🌙 *Result*  :: *BLOCKED 🔴*
│ 🍃 *Flavour* :: _この人は守られている！_
│
│ 🛡️ *Shield*  :: *Staff Immunity*
│
│ ⚠️ *This target cannot be robbed!*
╰───────────────❀`
      }, { quoted: msg });
    }

    // Check rob charm
    if (target.robShieldExpiry && target.robShieldExpiry > Date.now()) {
      const minsLeft = Math.ceil((target.robShieldExpiry - Date.now()) / 60000);
      return sock.sendMessage(jid, {
        text:
`╭─❀「 🦹 *𝐑𝐎𝐁* 」❀─╮
│ 🌙 *Result*  :: *BLOCKED 🔴*
│ 🍃 *Flavour* :: _護符が守っている！_
│
│ 🧿 *Shield*  :: *Rob Charm*
│ ⏳ *Expires* :: *${minsLeft}m remaining*
│
│ ⚠️ *Try again later!*
╰───────────────❀`
      }, { quoted: msg });
    }

    if (target.money < 100) {
      return sock.sendMessage(jid, {
        text:
`╭─❀「 🦹 *𝐑𝐎𝐁* 」❀─╮
│ 🌙 *Result*  :: *ABORTED 🔴*
│ 🍃 *Flavour* :: _金がない！意味がない！_
│
│ 💸 *Target*  :: *Broke (${fmt(target.money)})*
│
│ 😂 *Not worth it! Minimum $100 needed.*
╰───────────────❀`
      }, { quoted: msg });
    }

    const amount  = Math.min(10000, Math.floor(Math.random() * (target.money * 0.3)) + 100);
    const success = Math.random() > 0.45;
    const tag     = `@${targetJid.split("@")[0]}`;

    robber.lastRob = now;

    if (success) {
      target.money -= amount;
      robber.money += amount;
      await saveUser(sender, robber);
      await saveUser(targetJid, target);
      await addHistory(sender,    "rob",        amount,  `Robbed ${target.name}`);
      await addHistory(targetJid, "rob_victim", -amount, `Robbed by ${robber.name}`);

      await sock.sendMessage(jid, {
        text:
`╭─❀「 🦹 *𝐑𝐎𝐁* 」❀─╮
│ 🌙 *Result*  :: *SUCCESS 🟢*
│ 🍃 *Flavour* :: _完璧な強盗！影のように！_
│
│ 👤 *Target*  :: *${tag}*
│ 💰 *Stolen*  :: *+${fmt(amount)}*
│ 💰 *Wallet*  :: *${fmt(robber.money)}*
│
│ 🦹 *Clean getaway! Mission complete!* ⚔️
╰───────────────❀`,
        mentions: [targetJid],
      }, { quoted: msg });
    } else {
      const fine   = Math.floor(amount * 0.7);
      robber.money = Math.max(0, robber.money - fine);
      await saveUser(sender, robber);
      await addHistory(sender, "rob", -fine, `Rob failed — fined $${fine.toLocaleString()}`);

      await sock.sendMessage(jid, {
        text:
`╭─❀「 🦹 *𝐑𝐎𝐁* 」❀─╮
│ 🌙 *Result*  :: *CAUGHT 🔴*
│ 🍃 *Flavour* :: _捕まった！逃げ遅れた..._
│
│ 💸 *Fine*    :: *-${fmt(fine)}*
│ 💰 *Wallet*  :: *${fmt(robber.money)}*
│
│ 🚔 *You got busted! Lie low for 45 min.*
╰───────────────❀`
      }, { quoted: msg });
    }
  }
};
