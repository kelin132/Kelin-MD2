/**
 * KELIN MD — .beg
 * Beg for a small amount of money. Small rewards, real cooldown.
 */
import { getUser, saveUser, requireRegistration, addHistory, maybeAwardDiamonds } from "./database.js";

const COOLDOWN = 3 * 60 * 1000; // 3 minutes

const SUCCESS_MSGS = [
  (n, $) => `🙏 A kind stranger tosses you *$${$}* after you flash your empty pockets.`,
  (n, $) => `😢 You begged outside the mall and someone dropped *$${$}* in your cup.`,
  (n, $) => `🎰 A gambler felt guilty and handed you *$${$}*. Every dollar counts!`,
  (n, $) => `👴 An old man took pity on you and gave you *$${$}*. Don't waste it.`,
  (n, $) => `🤲 You held a cardboard sign and collected *$${$}* from passing cars.`,
  (n, $) => `☕ Someone bought you coffee and gave you *$${$}* change. Small wins!`,
  (n, $) => `🐕 Even a dog felt bad for you — its owner gave you *$${$}*.`,
  (n, $) => `📢 You performed on the street corner and earned *$${$}* in tips.`,
];

const FAIL_MSGS = [
  `😤 Nobody gave you anything. Maybe try looking less suspicious.`,
  `🙄 People walked past like you were invisible. Rough day.`,
  `🚔 Security escorted you off the premises. Zero earned.`,
  `😂 Someone laughed at you and kept walking. Embarrassing.`,
  `🤷 The crowd ignored you completely. Not your day.`,
  `💸 Someone dropped a coin… then picked it back up. Brutal.`,
  `😒 You got lectured about "getting a real job" instead of money.`,
];

export default {
  name: "beg",
  aliases: ["spare", "panhandle"],
  category: "economy",
  description: "Beg for a small amount of money (3-min cooldown)",
  usage: ".beg",
  cooldown: 5,

  async run({ sock, msg, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });

    const user = await getUser(sender);
    const now  = Date.now();

    // Cooldown
    const lastBeg = user.lastBeg || 0;
    if (now - lastBeg < COOLDOWN) {
      const left = Math.ceil((COOLDOWN - (now - lastBeg)) / 1000);
      const m    = Math.floor(left / 60);
      const s    = left % 60;
      return reply(`⏰ *Cooldown!* You're still embarrassed from last time.\n\nWait *${m}m ${s}s* before begging again.`);
    }

    // 35% chance of failure — people aren't always generous
    const failed = Math.random() < 0.35;

    if (failed) {
      user.lastBeg = now;
      await saveUser(sender, user);
      const msg_ = FAIL_MSGS[Math.floor(Math.random() * FAIL_MSGS.length)];
      return reply(`🤲 *BEGGING FAILED*\n\n${msg_}\n\n💰 Earned: *$0*`);
    }

    // Success — small amount, it's begging after all ($50–$400)
    const amount   = 50 + Math.floor(Math.random() * 351);
    user.money     = (user.money || 0) + amount;
    user.lastBeg   = now;
    user.xp        = (user.xp || 0) + 5;
    const diamondReward = maybeAwardDiamonds(user, 0.005, 1, 2);
    await saveUser(sender, user);
    await addHistory(sender, "beg", amount, "Begged for money");

    const pick = SUCCESS_MSGS[Math.floor(Math.random() * SUCCESS_MSGS.length)];
    return reply(
`🤲 *BEGGING SUCCESS*

${pick(sender.split("@")[0], amount.toLocaleString())}

💰 Earned   : *$${amount.toLocaleString()}*
💵 Wallet   : *$${user.money.toLocaleString()}*${diamondReward ? `\n💎 Rare find: *+${diamondReward} Diamond${diamondReward === 1 ? "" : "s"}*` : ""}

_⏰ Cooldown: 3 minutes_`
    );
  },
};
