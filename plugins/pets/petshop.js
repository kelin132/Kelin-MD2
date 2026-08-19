// .petshop [page|buy <number>] — Buy care items for the active pet
import { getActivePet, savePet, awardExp } from "../../lib/petDatabase.js";
import { getUser, saveUser, requireRegistration } from "../economy/database.js";

const SHOP = [
  { key: "kibble", name: "🍖 Kibble", desc: "Restore 40 hunger", price: 200, apply: (pet) => ({ hunger: Math.min(100, pet.hunger + 40) }) },
  { key: "meal", name: "🍣 Premium Meal", desc: "Full hunger + 10 happiness", price: 500, apply: (pet) => ({ hunger: 100, happiness: Math.min(100, pet.happiness + 10) }) },
  { key: "toy", name: "🎾 Toy", desc: "Restore 35 happiness", price: 300, apply: (pet) => ({ happiness: Math.min(100, pet.happiness + 35) }) },
  { key: "exppotion", name: "🧪 EXP Potion", desc: "Grant 150 EXP instantly", price: 800 },
  { key: "revival", name: "💊 Revival Tonic", desc: "Restore 60 hunger + 40 happiness", price: 600, apply: (pet) => ({ hunger: Math.min(100, pet.hunger + 60), happiness: Math.min(100, pet.happiness + 40) }) },
  { key: "berry", name: "🍓 Sweet Berry", desc: "Restore 20 hunger + 20 happiness", price: 150, apply: (pet) => ({ hunger: Math.min(100, pet.hunger + 20), happiness: Math.min(100, pet.happiness + 20) }) },
  { key: "energy", name: "⚡ Energy Drink", desc: "Restore 50 happiness", price: 700, apply: (pet) => ({ happiness: Math.min(100, pet.happiness + 50) }) },
  { key: "deluxemeal", name: "🍱 Deluxe Bento", desc: "Full hunger + 25 happiness", price: 1_200, apply: (pet) => ({ hunger: 100, happiness: Math.min(100, pet.happiness + 25) }) },
  { key: "grooming", name: "🧼 Grooming Kit", desc: "Restore 70 happiness", price: 1_000, apply: (pet) => ({ happiness: Math.min(100, pet.happiness + 70) }) },
  { key: "friendship", name: "💖 Friendship Ribbon", desc: "Restore 100 happiness", price: 2_500, apply: (pet) => ({ happiness: 100 }) },
  { key: "superxp", name: "🌟 Super EXP Potion", desc: "Grant 500 EXP instantly", price: 2_500 },
  { key: "goldenmeal", name: "👑 Golden Meal", desc: "Full hunger + 50 happiness", price: 4_000, apply: (pet) => ({ hunger: 100, happiness: Math.min(100, pet.happiness + 50) }) },
];

const PAGE_SIZE = 6;
const fmt = (n) => `$${Number(n || 0).toLocaleString()}`;

function shopText(page = 1) {
  const totalPages = Math.ceil(SHOP.length / PAGE_SIZE);
  const safePage = Math.min(totalPages, Math.max(1, page));
  const start = (safePage - 1) * PAGE_SIZE;
  const list = SHOP.slice(start, start + PAGE_SIZE).map((item, index) =>
    `│  ⚜️ *\`${start + index + 1}.\` ${item.name}*  — \`${fmt(item.price)}\`\n│     _${item.desc}_`
  ).join("\n│\n");
  return [
    `╭─❀「 🏪 *𝐏𝐄𝐓 𝐒𝐇𝐎𝐏* 」❀─╮`,
    `│ Page \`${safePage}/${totalPages}\`  •  \`${SHOP.length}\` items`,
    `│`,
    list,
    `│`,
    `│ 💡 \`.petshop ${safePage < totalPages ? safePage + 1 : 1}\` — next page`,
    `│ 💡 \`.petshop buy <number>\` — purchase`,
    `╰───────────────❀`,
  ].join("\n");
}

export default {
  name: "petshop",
  description: "Browse two pages of pet care items and buy with economy coins",
  category: "pets",
  usage: ".petshop [1|2] or .petshop buy <number>",
  aliases: ["pshop"],
  cooldown: 3,

  async run({ sock, msg, args, sender }) {
    const jid = msg.key.remoteJid;
    if (!await requireRegistration(sock, msg, sender)) return;

    const action = (args[0] || "").toLowerCase();
    if (action !== "buy") {
      const page = /^\d+$/.test(action) ? Number(action) : 1;
      return sock.sendMessage(jid, { text: shopText(page) }, { quoted: msg });
    }

    const itemNumber = Number(args[1]);
    const item = Number.isInteger(itemNumber) ? SHOP[itemNumber - 1] : null;
    if (!item) {
      return sock.sendMessage(jid, { 
        text: `╭─❀「 🏪 *𝐏𝐄𝐓 𝐒𝐇𝐎𝐏* 」❀─╮\n│ ❌ Choose a valid item number.\n│\n│ 💡 Use \`.petshop\` or \`.petshop 2\` to browse.\n╰───────────────❀` 
      }, { quoted: msg });
    }

    const pet = await getActivePet(sender);
    if (!pet) {
      return sock.sendMessage(jid, { 
        text: `╭─❀「 🏪 *𝐏𝐄𝐓 𝐒𝐇𝐎𝐏* 」❀─╮\n│ 🐾 You don't have an active pet!\n│\n│ 💡 Use \`.adopt\` to get a companion.\n╰───────────────❀` 
      }, { quoted: msg });
    }

    const user = await getUser(sender);
    if ((user.money || 0) < item.price) {
      return sock.sendMessage(jid, { 
        text: `╭─❀「 🏪 *𝐏𝐄𝐓 𝐒𝐇𝐎𝐏* 」❀─╮\n│ ❌ Not enough money!\n│\n│ 💰 Cost: \`${fmt(item.price)}\`\n│ 💰 Balance: \`${fmt(user.money)}\`\n╰───────────────❀` 
      }, { quoted: msg });
    }

    user.money -= item.price;
    await saveUser(sender, user);

    let effectText;
    if (item.key === "exppotion" || item.key === "superxp") {
      const exp = item.key === "superxp" ? 500 : 150;
      const result = await awardExp(sender, pet.petId, exp);
      effectText = `│ ✨ *${pet.name}* gained \`${exp}\` EXP!`;
      if (result?.levelsGained > 0) effectText += `\n│ 🎉 *LEVEL UP!* Now Level \`${result.pet.level}\`!`;
    } else {
      const changes = item.apply(pet);
      await savePet(sender, pet.petId, changes);
      effectText = Object.entries(changes).map(([key, value]) => `│ ${key === "hunger" ? "🍖 Hunger" : "😊 Happiness"}: → \`${value}%\``).join("\n");
    }

    return sock.sendMessage(jid, {
      text: `╭─❀「 🏪 *𝐏𝐔𝐑𝐂𝐇𝐀𝐒𝐄* 」❀─╮\n│ ${item.name} bought for \`${fmt(item.price)}\`\n│\n${effectText}\n│\n│ 💰 Remaining: \`${fmt(user.money)}\`\n╰───────────────❀`,
    }, { quoted: msg });
  },
};
