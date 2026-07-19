import { Col } from "./db.js";

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default {
  name: "sc",
  aliases: ["cardsearch"],
  category: "cards",
  description: "Search cards by name with owner info",
  usage: ".sc <name> [page]",

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      if (!args.length) return reply("❌ Give a name to search.\nExample: .sc rimuru");

      let page = 1;
      if (!isNaN(args[args.length - 1])) page = parseInt(args.pop());

      const query = args.join(" ").trim();
      if (!query) return reply("❌ Invalid search query.");

      const limit = 10;
      const skip  = (page - 1) * limit;
      const regex = new RegExp(escapeRegex(query), "i");
      const filter = { name: { $regex: regex }, enabled: true };

      const total = await Col.cards().countDocuments(filter);
      if (!total) return reply(`❌ No cards found for "${query}"`);

      const cards = await Col.cards().find(filter).sort({ name: 1 }).skip(skip).limit(limit).toArray();
      const pages = Math.ceil(total / limit);

      // Build owner map
      const allUsers = await Col.users().find({}, { projection: { userId: 1, username: 1, cards: 1 } }).toArray();
      const ownerMap = new Map();
      for (const u of allUsers) {
        if (!Array.isArray(u.cards)) continue;
        for (const c of u.cards) {
          if (!c?.cardId) continue;
          if (!ownerMap.has(c.cardId)) ownerMap.set(c.cardId, []);
          ownerMap.get(c.cardId).push(u.username || u.userId || "Unknown");
        }
      }

      let text =
`ㅤㅤ∘]───❀───[∘
*∘₊✧ CARD SEARCH* ❀
     ∘]───❀───[∘

𝗤𝘂𝗲𝗿𝘆: ${query}
𝗣𝗮𝗴𝗲: ${page}/${pages}
𝗧𝗼𝘁𝗮𝗹: ${total}

━━━━━━━━━━━━━━━`;

      cards.forEach((c, i) => {
        const owners   = ownerMap.get(c.cardId) || [];
        const ownerList = owners.length
          ? owners.slice(0, 5).map(n => `• ${n}`).join("\n")
          : "None";
        const extra = owners.length > 5 ? `\n+${owners.length - 5} more` : "";

        text += `

🃏 ${skip + i + 1}. ${c.name}
⭐ 𝗧𝗶𝗲𝗿: ${c.tier}
💰 𝗣𝗿𝗶𝗰𝗲: $${Number(c.price || 0).toLocaleString()}
🆔 𝗜𝗗: ${c.cardId}

👤 𝗢𝘄𝗻𝗲𝗿𝘀: ${owners.length}
${ownerList}${extra}`;
      });

      text += `

  *❀────⋆⋅∘⋅⋆────❀*
 *USE .CI <NAME/ID>*
  *❀────⋆⋅∘⋅⋆────❀*
      ∘──────∘`;

      return reply(text);

    } catch (err) {
      console.error("SC ERROR:", err);
      return reply("❌ Search failed.");
    }
  },
};
