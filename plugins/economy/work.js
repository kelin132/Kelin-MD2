import { readData, writeData } from "../../lib/store.mjs";

const WORK_COOLDOWN = 60 * 60 * 1000; // 1 hour
const JOBS = [
  { job: "developer", earn: [200, 400] },
  { job: "delivery rider", earn: [100, 250] },
  { job: "street vendor", earn: [80, 180] },
  { job: "musician", earn: [150, 350] },
  { job: "hacker 🕶️", earn: [300, 600] },
  { job: "chef", earn: [120, 280] },
  { job: "teacher", earn: [90, 200] },
  { job: "mechanic", earn: [130, 300] },
];

export default {
  name: "work",
  description: "Work to earn coins (1 hr cooldown)",
  category: "economy",
  usage: ".work",
  aliases: ["job"],
  cooldown: 3,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg, senderNum }) {
    const jid  = msg.key.remoteJid;
    const eco  = readData("economy", {});
    const data = eco[senderNum] ?? { coins: 0, bank: 0, lastWork: 0 };

    const now  = Date.now();
    const diff = now - (data.lastWork ?? 0);
    if (diff < WORK_COOLDOWN) {
      const rem = Math.ceil((WORK_COOLDOWN - diff) / 60_000);
      return sock.sendMessage(jid, { text: `⏳ You're tired! Rest for *${rem} minute(s)*.` }, { quoted: msg });
    }

    const { job, earn } = JOBS[Math.floor(Math.random() * JOBS.length)];
    const amount = Math.floor(Math.random() * (earn[1] - earn[0] + 1)) + earn[0];
    data.coins    = (data.coins ?? 0) + amount;
    data.lastWork  = now;
    eco[senderNum] = data;
    writeData("economy", eco);

    await sock.sendMessage(jid, {
      text: `💼 You worked as a *${job}* and earned *${amount} coins*!\n💰 Balance: *${data.coins}*`,
    }, { quoted: msg });
  },
};
