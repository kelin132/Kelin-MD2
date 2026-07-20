import { getUser, requireRegistration } from "./database.js";

export default {
  name: "orbs",
  aliases: ["myorbs", "orbbal"],
  category: "economy",
  description: "Check your orb balance — premium currency earned from digging, fishing, and events",
  usage: ".orbs",

  async run({ sock, msg, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const user = await getUser(sender);
    const orbs = user.orbs ?? 0;

    const tier = orbs >= 100 ? "🌟 Orb Master"
               : orbs >= 50  ? "💫 Orb Collector"
               : orbs >= 20  ? "🔮 Orb Seeker"
               :               "✨ Novice";

    await sock.sendMessage(msg.key.remoteJid, {
      text:
`🔮 *ORB BALANCE*

👤 @${sender.split("@")[0]}
🔮 Orbs    : ${orbs.toLocaleString()} 🔮
🏅 Tier    : ${tier}

*How to earn orbs:*
• ⛏️  *.dig* — dig up orbs randomly
• 🎣  *.fish* — fish for orbs
• 🎰  Special events

*How to spend:*
• Use *.shop* to buy orb items`,
      mentions: [sender],
    }, { quoted: msg });
  },
};
