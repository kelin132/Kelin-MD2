import { getUser, saveUser, requireRegistration, isRegistered } from "./database.js";

const SHAME_COOLDOWN = 60 * 60 * 1000; // 1 hour per target

// In-memory per-sender-target cooldown map to prevent spam
const lastShamed = new Map();

const SHAME_MSGS = [
  "brought great dishonour to their family.",
  "tripped over their own shoelaces in public.",
  "called a group chat 'babe' by accident.",
  "liked their own post thinking it was someone else's.",
  "sent 'good morning' to the wrong person.",
  "spent 20 minutes arguing with a bot.",
  "bought the extended warranty.",
  "laughed at their own joke before finishing it.",
  "forgot their password three times in a row.",
  "asked what time a 24-hour store closes.",
];

export default {
  name: "shame",
  aliases: ["callout"],
  category: "economy",
  description: "Publicly shame someone and add to their shame count",
  usage: ".shame @user",

  async run({ sock, msg, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid    = msg.key.remoteJid;
    const reply  = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });
    const target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
                || msg.message?.extendedTextMessage?.contextInfo?.quotedParticipant;

    if (!target)         return reply("❌ Mention or reply to a user to shame them.\nUsage: .shame @user");
    if (target === sender) return reply("😬 Can't shame yourself — that's just depression.");

    if (!await isRegistered(target)) return reply("❌ That user isn't registered in the economy.");

    const cdKey = `${sender}:${target}`;
    const now   = Date.now();
    if (lastShamed.has(cdKey) && now - lastShamed.get(cdKey) < SHAME_COOLDOWN) {
      const rem  = SHAME_COOLDOWN - (now - lastShamed.get(cdKey));
      const mins = Math.floor(rem / 60000);
      return reply(`⏰ You shamed them recently. Try again in *${mins}m*.`);
    }
    lastShamed.set(cdKey, now);

    const victim   = await getUser(target);
    victim.shame   = (victim.shame || 0) + 1;
    victim.shameBy = sender.split("@")[0];
    await saveUser(target, victim);

    const reason = SHAME_MSGS[Math.floor(Math.random() * SHAME_MSGS.length)];
    const tag    = `@${target.split("@")[0].split(":")[0]}`;

    await sock.sendMessage(jid, {
      text:
`😤 *SHAME ALERT* 😤

${tag} has ${reason}

🔴 Total shames: *${victim.shame}*
😭 Last shamed by: @${sender.split("@")[0]}`,
      mentions: [target, sender],
    }, { quoted: msg });
  },
};
