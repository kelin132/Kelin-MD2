import { readData, writeData } from "../../lib/store.mjs";

const DAILY_AMOUNT = 500;
const COOLDOWN_MS  = 24 * 60 * 60 * 1000; // 24 hours

export default {
  name: "daily",
  description: "Claim your daily coin reward",
  category: "economy",
  usage: ".daily",
  aliases: ["claim"],
  cooldown: 3,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg, senderNum }) {
    const jid = msg.key.remoteJid;
    const eco = readData("economy", {});
    const data = eco[senderNum] ?? { coins: 0, bank: 0, lastDaily: 0 };

    const now  = Date.now();
    const diff = now - (data.lastDaily ?? 0);
    if (diff < COOLDOWN_MS) {
      const rem = Math.ceil((COOLDOWN_MS - diff) / 3_600_000);
      return sock.sendMessage(jid, {
        text: `⏳ You already claimed your daily!\nCome back in *${rem} hour(s)*.`,
      }, { quoted: msg });
    }

    data.coins    = (data.coins ?? 0) + DAILY_AMOUNT;
    data.lastDaily = now;
    eco[senderNum] = data;
    writeData("economy", eco);

    await sock.sendMessage(jid, {
      text: `✅ Daily claimed!\n+${DAILY_AMOUNT} coins 💰\nNew balance: *${data.coins} coins*`,
    }, { quoted: msg });
  },
};
