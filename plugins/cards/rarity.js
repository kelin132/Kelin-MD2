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

⚪ *COMMON* (Tier 1)
• Spawn Rate: Very High
• Drop Chance: ~45%

🟢 *UNCOMMON* (Tier 2)
• Spawn Rate: High
• Drop Chance: ~25%

🔵 *RARE* (Tier 3)
• Spawn Rate: Medium
• Drop Chance: ~15%

🟣 *EPIC* (Tier 4)
• Spawn Rate: Low
• Drop Chance: ~8%

🟡 *LEGENDARY* (Tier 5)
• Spawn Rate: Very Low
• Drop Chance: ~7%

━━━━━━━━━━━━━━━

📌 Notes:
• Higher tier = lower spawn chance
• Cards auto-spawn every 15 min in enabled groups
• Use *.claim <ID>* to grab a spawned card
• Use *.cardspawn on* to enable spawns in your group`;

    await sock.sendMessage(jid, { text }, { quoted: msg });
  },
};
