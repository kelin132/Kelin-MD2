export default {
  name: "rarity",
  aliases: ["rrt", "tiers"],
  category: "cards",
  description: "View the card rarity system and spawn chances",
  usage: ".rarity",

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;

    const text =
`🃏 *CARD RARITY SYSTEM*

━━━━━━━━━━━━━━━

⚪ *COMMON*
• Spawn Rate: Very High
• Drop Chance: ~45%

🟢 *UNCOMMON*
• Spawn Rate: High
• Drop Chance: ~25%

🔵 *RARE*
• Spawn Rate: Medium
• Drop Chance: ~15%

🟣 *EPIC*
• Spawn Rate: Low
• Drop Chance: ~8%

🟡 *LEGENDARY*
• Spawn Rate: Very Low
• Drop Chance: ~5%

🔴 *MYTHIC*
• Spawn Rate: Extremely Rare
• Drop Chance: ~2%

━━━━━━━━━━━━━━━

📌 Notes:
• Higher rarity = lower spawn probability
• Auto-spawns every 15 min in enabled groups
• Use *.claim <ID>* to grab a spawned card`;

    await sock.sendMessage(jid, { text }, { quoted: msg });
  },
};
