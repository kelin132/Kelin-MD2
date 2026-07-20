import { getUser, requireRegistration } from "./database.js";

const SHAME_TIERS = [
  { min: 0,  label: "😇 Pure soul",         msg: "Nobody has shamed you. Suspicious." },
  { min: 1,  label: "😅 Slightly shameful",  msg: "You've earned a little shame." },
  { min: 5,  label: "😬 Embarrassing",       msg: "People notice your chaos." },
  { min: 10, label: "🤡 Walking L",          msg: "You are a certified clown." },
  { min: 20, label: "💀 Hall of Shame",      msg: "You have transcended normal embarrassment." },
  { min: 50, label: "👹 Shame Demon",        msg: "You ARE the shame. The legends speak of you." },
];

function getTier(count) {
  for (let i = SHAME_TIERS.length - 1; i >= 0; i--) {
    if (count >= SHAME_TIERS[i].min) return SHAME_TIERS[i];
  }
  return SHAME_TIERS[0];
}

export default {
  name: "myshame",
  aliases: ["shameme", "shamestats"],
  category: "economy",
  description: "Check how many times you've been publicly shamed",
  usage: ".myshame",

  async run({ sock, msg, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid  = msg.key.remoteJid;
    const user = await getUser(sender);
    const count = user.shame || 0;
    const tier  = getTier(count);

    const bar = count >= 50 ? "🔴🔴🔴🔴🔴"
              : count >= 20 ? "🟠🟠🟠🟠⚫"
              : count >= 10 ? "🟡🟡🟡⚫⚫"
              : count >= 5  ? "🟢🟢⚫⚫⚫"
              : count >= 1  ? "🟢⚫⚫⚫⚫"
              :               "⚫⚫⚫⚫⚫";

    await sock.sendMessage(jid, {
      text:
`😤 *SHAME STATS*

👤 @${sender.split("@")[0]}
🔴 Times Shamed : *${count}*
🏷️  Shame Rank  : ${tier.label}
📊 [${bar}]

💬 _${tier.msg}_
${user.shameBy ? `\n😈 Last shamed by @${user.shameBy}` : ""}`,
      mentions: [sender],
    }, { quoted: msg });
  },
};
