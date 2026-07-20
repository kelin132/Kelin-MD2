/**
 * .heist <amount>  — start a group heist (stake that amount)
 * .heist join      — join the active heist in this group
 * .heist cancel    — cancel heist (starter only)
 * .heist status    — check who's joined
 */
import { getUser, saveUser, requireRegistration, isRegistered, addHistory } from "./database.js";

const JOIN_WINDOW    = 60 * 1000;  // 60 seconds to join
const MIN_STAKE      = 500;
const MAX_STAKE      = 5_000;
const MIN_MEMBERS    = 2;
const WIN_MULTIPLIER = 1.8;        // 80% profit on each stake
const SUCCESS_RATE   = 0.45;       // 45% success

const activeHeists = new Map();    // jid → { starter, stake, members, timeout }

export default {
  name: "heist",
  aliases: ["robgroup", "crew"],
  category: "economy",
  description: "Start a group heist — recruit your crew and rob the bank together!",
  usage: ".heist <amount>  |  .heist join  |  .heist status  |  .heist cancel",
  checkJail: true,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });
    const sub   = (args[0] || "").toLowerCase();

    if (!jid.endsWith("@g.us")) return reply("❌ Heist only works in groups!");

    // ── STATUS ────────────────────────────────────────────────────────────────
    if (sub === "status") {
      const heist = activeHeists.get(jid);
      if (!heist) return reply("ℹ️ No active heist in this group.\n\nStart one with *.heist <amount>*");
      const names = heist.members.map(m => `• @${m.id.split("@")[0]}`).join("\n");
      return await sock.sendMessage(jid, {
        text:
`🦹 *ACTIVE HEIST*

💰 Stake per person : $${heist.stake.toLocaleString()}
👥 Crew             : ${heist.members.length}/${MIN_MEMBERS} minimum
⏳ Auto-executes in : ${Math.max(0, Math.ceil((heist.startsAt - Date.now()) / 1000))}s

*Crew:*\n${names}\n\nJoin with *.heist join*`,
        mentions: heist.members.map(m => m.id),
      }, { quoted: msg });
    }

    // ── CANCEL ────────────────────────────────────────────────────────────────
    if (sub === "cancel") {
      const heist = activeHeists.get(jid);
      if (!heist)               return reply("❌ No active heist to cancel.");
      if (heist.starter !== sender) return reply("❌ Only the heist starter can cancel it.");

      clearTimeout(heist.timeout);

      // Refund all stakes
      for (const m of heist.members) {
        const u = await getUser(m.id);
        u.money = (u.money || 0) + m.stake;
        await saveUser(m.id, u);
      }
      activeHeists.delete(jid);

      return await sock.sendMessage(jid, {
        text: "❌ *Heist cancelled!*\n\nAll stakes have been refunded.",
        mentions: heist.members.map(m => m.id),
      }, { quoted: msg });
    }

    // ── JOIN ──────────────────────────────────────────────────────────────────
    if (sub === "join") {
      const heist = activeHeists.get(jid);
      if (!heist) return reply("❌ No active heist. Start one with *.heist <amount>*");
      if (heist.members.find(m => m.id === sender)) return reply("❌ You're already in this heist.");

      const user = await getUser(sender);
      if (user.money < heist.stake) {
        return reply(`❌ You need *$${heist.stake.toLocaleString()}* to join. You only have $${user.money.toLocaleString()}.`);
      }

      user.money -= heist.stake;
      await saveUser(sender, user);
      heist.members.push({ id: sender, stake: heist.stake });

      return await sock.sendMessage(jid, {
        text:
`✅ *@${sender.split("@")[0]} joined the heist!*

💰 Stake : $${heist.stake.toLocaleString()}
👥 Crew  : ${heist.members.length} member(s)

Still time to join with *.heist join*!`,
        mentions: [sender],
      }, { quoted: msg });
    }

    // ── START HEIST ───────────────────────────────────────────────────────────
    if (activeHeists.has(jid)) {
      return reply("❌ There's already an active heist in this group.\n\nUse *.heist join* to join it.");
    }

    const stake = parseInt(args[0]);
    if (isNaN(stake) || stake < MIN_STAKE) return reply(`❌ Minimum stake is $${MIN_STAKE.toLocaleString()}.`);
    if (stake > MAX_STAKE)                  return reply(`❌ Maximum stake is $${MAX_STAKE.toLocaleString()}.`);

    const user = await getUser(sender);
    if (user.money < stake) {
      return reply(`❌ You need *$${stake.toLocaleString()}* to start a heist.\nYou only have $${user.money.toLocaleString()}.`);
    }

    user.money -= stake;
    await saveUser(sender, user);

    const heist = {
      starter:  sender,
      stake,
      members:  [{ id: sender, stake }],
      startsAt: Date.now() + JOIN_WINDOW,
      timeout:  null,
    };

    // Auto-execute after JOIN_WINDOW
    heist.timeout = setTimeout(async () => {
      const h = activeHeists.get(jid);
      if (!h) return;
      activeHeists.delete(jid);
      await executeHeist(sock, jid, h);
    }, JOIN_WINDOW);

    activeHeists.set(jid, heist);

    await sock.sendMessage(jid, {
      text:
`🦹 *HEIST STARTED!*

💰 Stake per person : $${stake.toLocaleString()}
⏳ Join window      : 60 seconds
👥 Min crew         : ${MIN_MEMBERS} people

@${sender.split("@")[0]} is the starter!
Type *.heist join* to join the crew!`,
      mentions: [sender],
    }, { quoted: msg });
  },
};

async function executeHeist(sock, jid, heist) {
  const totalPot = heist.members.reduce((s, m) => s + m.stake, 0);
  const won      = Math.random() < SUCCESS_RATE && heist.members.length >= MIN_MEMBERS;
  const mentions = heist.members.map(m => m.id);
  const tags     = heist.members.map(m => `@${m.id.split("@")[0]}`).join(" ");

  if (won) {
    const payout = Math.floor((totalPot * WIN_MULTIPLIER) / heist.members.length);
    for (const m of heist.members) {
      const u = await getUser(m.id);
      u.money = (u.money || 0) + payout;
      await saveUser(m.id, u);
      await addHistory(m.id, "rob", payout - m.stake, `Heist payout $${payout.toLocaleString()}`);
    }

    await sock.sendMessage(jid, {
      text:
`🎉 *HEIST SUCCESSFUL!*

💰 Total stolen : $${(totalPot * WIN_MULTIPLIER).toLocaleString()}
💵 Each payout  : $${payout.toLocaleString()}

Crew: ${tags}

The security guards never saw it coming! 🦹💨`,
      mentions,
    });
  } else {
    if (heist.members.length < MIN_MEMBERS) {
      // Not enough crew — refund everyone
      for (const m of heist.members) {
        const u = await getUser(m.id);
        u.money = (u.money || 0) + m.stake;
        await saveUser(m.id, u);
      }

      return sock.sendMessage(jid, {
        text:
`❌ *HEIST ABORTED!*

Not enough crew members (need ${MIN_MEMBERS}).
All stakes have been refunded.`,
        mentions,
      });
    }

    await sock.sendMessage(jid, {
      text:
`🚨 *HEIST FAILED!*

The police arrived before you could escape!
💸 Total lost : $${totalPot.toLocaleString()}

Everyone lost their stake. Better luck next time! 😭

Crew: ${tags}`,
      mentions,
    });
  }
}
