import { getUser, saveUser, requireRegistration, addHistory, checkLevelUp } from "./database.js";
import { generateWorkImage } from "../../lib/economyCanvas.mjs";

const WORK_COOLDOWN  = 9 * 60 * 1000;
const JOB_CHANGE_CD  = 24 * 60 * 60 * 1000;
const FIRE_CHANCE    = 0.30;

const jobs = {
  programmer:   { pay: 3500,  emoji: "👨‍💻", xp: 80,  tier: "Regular" },
  hacker:       { pay: 5500,  emoji: "🎭", xp: 120, tier: "Regular" },
  farmer:       { pay: 2000,  emoji: "👨‍🌾", xp: 40,  tier: "Regular" },
  doctor:       { pay: 4500,  emoji: "⚕️",  xp: 100, tier: "Regular" },
  teacher:      { pay: 2800,  emoji: "👨‍🏫", xp: 60,  tier: "Regular" },
  police:       { pay: 3800,  emoji: "👮",  xp: 90,  tier: "Regular" },
  artist:       { pay: 3200,  emoji: "🎨", xp: 70,  tier: "Regular" },
  chef:         { pay: 3600,  emoji: "👨‍🍳", xp: 80,  tier: "Regular" },
  trader:       { pay: 7000,  emoji: "📈", xp: 150, tier: "Regular" },
  mechanic:     { pay: 3900,  emoji: "🔧", xp: 85,  tier: "Regular" },
  assassin:     { pay: 12000, emoji: "🗡️",  xp: 200, tier: "Elite" },
  kingpin:      { pay: 15000, emoji: "👑", xp: 250, tier: "Elite" },
  spy:          { pay: 9000,  emoji: "🕵️",  xp: 180, tier: "Elite" },
  bountyHunter: { pay: 10500, emoji: "🎯", xp: 190, tier: "Elite" },
  dragonTamer:  { pay: 8500,  emoji: "🐉", xp: 170, tier: "Elite" },
  alchemist:    { pay: 7500,  emoji: "⚗️",  xp: 160, tier: "Elite" },
  warlord:      { pay: 13500, emoji: "⚔️",  xp: 220, tier: "Elite" },
  hiredGun:     { pay: 11000, emoji: "🔫", xp: 195, tier: "Elite" },
  cryptoWhale:  { pay: 18000, emoji: "🐋", xp: 300, tier: "Elite" },
  overlord:     { pay: 20000, emoji: "😈", xp: 350, tier: "Elite" },
};

function resolveJob(input) {
  const key = input.toLowerCase().replace(/\s+/g, "");
  return Object.keys(jobs).find(k => k.toLowerCase() === key) || null;
}

function fmtTime(ms) {
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function fmt(n) { return `$${n.toLocaleString()}`; }

function buildBoard() {
  const reg  = Object.entries(jobs).filter(([, v]) => v.tier === "Regular");
  const elit = Object.entries(jobs).filter(([, v]) => v.tier === "Elite");
  const line = ([n, j]) => `│  ${j.emoji} *${n}* :: _$${j.pay.toLocaleString()} (+${j.xp} xp)_`;

  return (
`╭─❀「 💼 *𝐉𝐎𝐁𝐒 𝐁𝐎𝐀𝐑𝐃* 」❀─╮
│ 〔 🔹 *Regular Jobs* 〕
${reg.map(line).join("\n")}
│
│ 〔 💎 *Elite Jobs* 〕
${elit.map(line).join("\n")}
│
│ 📝 *.work <jobname>* to apply
│ 🔄 *.work change <jobname>* to switch
│ ⚠️ Every shift has a *30%* fire risk!
╰───────────────❀`
  );
}

export default {
  name: "work",
  description: "Pick a job, clock in, and earn money — but watch out for the pink slip!",
  category: "economy",
  cooldown: 5,
  usage: ".work | .work jobs | .work <job> | .work change <job>",
  checkJail: true,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid  = msg.key.remoteJid;
    const user = await getUser(sender);
    const now  = Date.now();

    // ── .work jobs ────────────────────────────────────────────────────────────
    if (args[0]?.toLowerCase() === "jobs") {
      return sock.sendMessage(jid, { text: buildBoard() }, { quoted: msg });
    }

    // ── .work [change] <jobname> ──────────────────────────────────────────────
    const isChange = args[0]?.toLowerCase() === "change";
    const jobInput = isChange ? args[1] : args[0];

    if (jobInput) {
      const jobKey = resolveJob(jobInput);
      if (!jobKey) {
        return sock.sendMessage(jid, {
          text:
`╭─❀「 💼 *𝐖𝐎𝐑𝐊* 」❀─╮
│ ❌ *Error* :: *Job not found*
│
│ 📋 Use *.work jobs* to see all positions
╰───────────────❀`
        }, { quoted: msg });
      }

      const sinceChange = now - (user.lastJobChange || 0);
      const hasJob      = !!user.job;
      const fired       = user.fired === true;

      if (hasJob && !fired && sinceChange < JOB_CHANGE_CD) {
        const remaining = JOB_CHANGE_CD - sinceChange;
        return sock.sendMessage(jid, {
          text:
`╭─❀「 💼 *𝐖𝐎𝐑𝐊* 」❀─╮
│ 🔒 *Result* :: *JOB LOCKED 🔴*
│
│ ${jobs[user.job]?.emoji || "❓"} *Current* :: *${user.job}*
│ ⏳ *Unlock*  :: *${fmtTime(remaining)}*
│
│ _(Job changes limited to once per day)_
╰───────────────❀`
        }, { quoted: msg });
      }

      user.job           = jobKey;
      user.fired         = false;
      user.lastJobChange = now;
      await saveUser(sender, user);

      const j = jobs[jobKey];
      return sock.sendMessage(jid, {
        text:
`╭─❀「 💼 *𝐖𝐎𝐑𝐊* 」❀─╮
│ ✅ *Result*  :: *HIRED 🟢*
│ 🍃 *Flavour* :: _ようこそ！新しい仕事へ！_
│
│ ${j.emoji} *Position* :: *${jobKey}*
│ 💰 *Base Pay* :: *$${j.pay.toLocaleString()} / shift*
│ 🔮 *XP Bonus* :: *+${j.xp} xp*
│
│ ⚔️ Use *.work* every 9 min to collect pay
│ ⚠️ Each shift carries a *30% fire risk!*
╰───────────────❀`
      }, { quoted: msg });
    }

    // ── No job / fired ────────────────────────────────────────────────────────
    if (!user.job || user.fired) {
      const status = user.fired
        ? "🚨 You were fired! Pick a new job below."
        : "😶 No job yet! Pick one below.";
      return sock.sendMessage(jid, {
        text: `${status}\n\n${buildBoard()}`
      }, { quoted: msg });
    }

    // ── Cooldown ──────────────────────────────────────────────────────────────
    const sinceWork = now - (user.lastWork || 0);
    if (sinceWork < WORK_COOLDOWN) {
      const remaining = WORK_COOLDOWN - sinceWork;
      const j = jobs[user.job];
      return sock.sendMessage(jid, {
        text:
`╭─❀「 💼 *𝐖𝐎𝐑𝐊* 」❀─╮
│ ⏳ *Result*  :: *SHIFT NOT READY 🔴*
│ 🍃 *Flavour* :: _休んで、次のシフトを待て！_
│
│ ${j.emoji} *Job*    :: *${user.job}*
│ 🕒 *Next*   :: *${fmtTime(remaining)}*
╰───────────────❀`
      }, { quoted: msg });
    }

    // ── Process shift ─────────────────────────────────────────────────────────
    const jobKey = user.job;
    const j      = jobs[jobKey];
    const fired  = Math.random() < FIRE_CHANCE;

    user.lastWork = now;

    if (fired) {
      const severance = Math.floor(j.pay * 0.5);
      user.money     += severance;
      user.xp         = (user.xp || 0) + Math.floor(j.xp * 0.5);
      user.job        = null;
      user.fired      = true;

      const { leveled, newLevel } = checkLevelUp(user);

      await saveUser(sender, user);
      await addHistory(sender, "work", severance, `Fired from ${jobKey} — severance pay`);

      const caption =
`╭─❀「 💼 *𝐖𝐎𝐑𝐊* 」❀─╮
│ 🌙 *Result*     :: *FIRED 🔴*
│ 🍃 *Flavour*    :: _クビになった…残念！_
│
│ ${j.emoji} *Role*      :: *${jobKey}*
│ 💸 *Severance*  :: *${fmt(severance)}*
│ 🔮 *XP*         :: *+${Math.floor(j.xp * 0.5)}*
│ 💵 *Wallet*     :: *${fmt(user.money)}*
│
│ 📋 Use *.work jobs* to find a new position!${leveled ? `\n│\n│ 🎉 *LEVEL UP!* — Now Level ${user.level}` : ""}
╰───────────────❀`;

      try {
        const imgBuffer = await generateWorkImage({
          fired: true, jobKey, jobEmoji: j.emoji,
          earned: severance, bonus: 0, xpGained: Math.floor(j.xp * 0.5),
          balance: user.money, leveled, level: user.level,
        });
        return sock.sendMessage(jid, { image: imgBuffer, caption }, { quoted: msg });
      } catch {
        return sock.sendMessage(jid, { text: caption }, { quoted: msg });
      }
    }

    // ── Successful shift ──────────────────────────────────────────────────────
    const bonus  = Math.floor(Math.random() * Math.floor(j.pay * 0.15));
    const total  = j.pay + bonus;
    user.money  += total;
    user.xp      = (user.xp || 0) + j.xp;

    const { leveled, newLevel } = checkLevelUp(user);

    await saveUser(sender, user);
    await addHistory(sender, "work", total, `Worked as ${jobKey}`);

    const caption =
`╭─❀「 💼 *𝐖𝐎𝐑𝐊* 」❀─╮
│ 🌙 *Result*  :: *PAYDAY 🟢*
│ 🍃 *Flavour* :: _お疲れ様！よくやった！_
│
│ ${j.emoji} *Job*     :: *${jobKey}*
│ 💰 *Earned*  :: *+${fmt(total)}*${bonus > 0 ? `  _(+${fmt(bonus)} bonus!)_` : ""}
│ 🔮 *XP*      :: *+${j.xp}*
│ 💵 *Wallet*  :: *${fmt(user.money)}*
│
│ ⚠️ *30% fire risk* each shift — stay sharp!${leveled ? `\n│\n│ 🎉 *LEVEL UP!* — Now Level ${user.level}` : ""}
╰───────────────❀`;

    try {
      const imgBuffer = await generateWorkImage({
        fired: false, jobKey, jobEmoji: j.emoji,
        earned: total, bonus, xpGained: j.xp,
        balance: user.money, leveled, level: user.level,
      });
      return sock.sendMessage(jid, { image: imgBuffer, caption }, { quoted: msg });
    } catch {
      return sock.sendMessage(jid, { text: caption }, { quoted: msg });
    }
  },
};
