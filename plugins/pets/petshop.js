// plugins/pets/petshop.js
// .petshop [buy <number>] — Buy items for your active pet using economy coins
import { getActivePet, savePet, awardExp } from "../../lib/petDatabase.js";
import { getUser, saveUser, requireRegistration } from "../economy/database.js";

const SHOP = {
  kibble: {
    name: "🍖 Kibble",
    desc: "Restore 40 hunger",
    price: 200,
    apply: (pet) => ({ hunger: Math.min(100, pet.hunger + 40) }),
  },
  meal: {
    name: "🍣 Premium Meal",
    desc: "Restore full hunger + 10 happiness",
    price: 500,
    apply: (pet) => ({ hunger: 100, happiness: Math.min(100, pet.happiness + 10) }),
  },
  toy: {
    name: "🎾 Toy",
    desc: "Restore 35 happiness",
    price: 300,
    apply: (pet) => ({ happiness: Math.min(100, pet.happiness + 35) }),
  },
  exppotion: {
    name: "🧪 EXP Potion",
    desc: "Grant 150 EXP instantly",
    price: 800,
    apply: null, // handled separately
  },
  revival: {
    name: "💊 Revival Tonic",
    desc: "Restore 60 hunger + 40 happiness",
    price: 600,
    apply: (pet) => ({
      hunger:    Math.min(100, pet.hunger + 60),
      happiness: Math.min(100, pet.happiness + 40),
    }),
  },
};

export default {
  name: "petshop",
  description: "Buy items for your pet with economy coins",
  category: "pets",
  usage: ".petshop [buy <number>]",
  aliases: ["pshop"],
  cooldown: 3,

  async run({ sock, msg, args, sender }) {
    const jid = msg.key.remoteJid;
    if (!await requireRegistration(sock, msg, sender)) return;

    // .petshop — show shop
    if (!args[0] || args[0].toLowerCase() !== "buy") {
      const list = Object.entries(SHOP).map(([key, item], index) =>
        `  ⚜️ *${index + 1}. ${item.name}*  (${key})\n    _${item.desc}_\n    💵 *$${item.price.toLocaleString()}*`
      ).join("\n\n");

      return sock.sendMessage(jid, {
        text: [
          `꧁━━〔 🏪 *P E T  S H O P* 〕━━꧂`,
          ``,
          list,
          ``,
          `  ━━━━━━━━━━━━━━━━━━━━━━━`,
          `  *.petshop buy <number>*`,
          `  e.g. *.petshop buy 1*`,
          ``,
          `꧂━━━━━━━━━━━━━━━━━━━━━━━━꧁`,
        ].join("\n"),
      }, { quoted: msg });
    }

    // .petshop buy <number>
    const itemNumber = Number(args[1]);
    const itemEntry  = Number.isInteger(itemNumber) ? Object.entries(SHOP)[itemNumber - 1] : null;
    const itemKey    = itemEntry?.[0];
    const item       = itemKey ? SHOP[itemKey] : null;

    if (!item) {
      return sock.sendMessage(jid, {
        text: "❌ Choose a valid item number.\n\nUse *.petshop* to see the numbered list.",
      }, { quoted: msg });
    }

    const pet = await getActivePet(sender);
    if (!pet) {
      return sock.sendMessage(jid, {
        text: `🐾 You don't have an active pet! Use *.adopt* first.`,
      }, { quoted: msg });
    }

    const user = await getUser(sender);
    if ((user.money || 0) < item.price) {
      return sock.sendMessage(jid, {
        text: `❌ Not enough money!\n\n💵 Cost    : $${item.price.toLocaleString()}\n💰 Balance : $${(user.money || 0).toLocaleString()}`,
      }, { quoted: msg });
    }

    // Deduct coins
    user.money -= item.price;
    await saveUser(sender, user);

    // Apply item effect
    let effectText = "";
    if (itemKey === "exppotion") {
      const result = await awardExp(sender, pet.petId, 150);
      effectText = `✨ *${pet.name}* gained 150 EXP!`;
      if (result?.levelsGained > 0) effectText += `\n🎉 *LEVEL UP!* Now Level ${result.pet.level}!`;
    } else {
      const changes = item.apply(pet);
      await savePet(sender, pet.petId, changes);
      effectText = Object.entries(changes)
        .map(([k, v]) => `${k === "hunger" ? "🍖 Hunger" : "😊 Happiness"}: → ${v}%`)
        .join("\n");
    }

    return sock.sendMessage(jid, {
      text: [
        `🏪 *PURCHASE SUCCESSFUL!*`,
        ``,
        `${item.name} bought for *$${item.price.toLocaleString()}*`,
        ``,
        effectText,
        ``,
        `💵 Remaining balance: $${user.money.toLocaleString()}`,
      ].join("\n"),
    }, { quoted: msg });
  },
};
