/**
 * KELIN MD — .afk command (Anime Edition)
 */
import { getUser, saveUser } from "../economy/database.js";
import { getAfkUser, setAfkUser } from "../../lib/pluginManager.mjs";

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function cleanJid(jid = "") {
  return jid.split(":")[0].replace(/@s\.whatsapp\.net$/, "") + "@s.whatsapp.net";
}

export default {
  name: "afk",
  aliases: ["away"],
  category: "group",
  cooldown: 6,
  description: "Go AFK — bot will notify others when they tag you.",
  usage: ".afk [reason]",

  async run({ sock, msg, sender, text: rawText }) {
    const jid       = msg.key.remoteJid;
    const normalizedSender = cleanJid(sender);
    
    const reply = (text, options = {}) => 
      sock.sendMessage(jid, { text, mentions: options.mentions || [] }, { quoted: msg, ...options });

    const user   = await getUser(normalizedSender);
    const reason = (rawText || "").trim() || "No reason given";
    const tag    = normalizedSender.split("@")[0];
    const name   = user.name || tag;

    const existingMemoryAfk = getAfkUser(normalizedSender);
    const existingDbAfk     = user?.afk?.active;
    const since = Date.now();

    // Save state using normalized JID
    user.afk = { active: true, message: reason, since };
    await saveUser(normalizedSender, user);

    setAfkUser(normalizedSender, {
      reason,
      time: since,
      username: name,
    });

    // If already AFK in memory or DB
    if (existingMemoryAfk || existingDbAfk) {
      return reply(
`╭───〔 💤 𝗔𝗙𝗞 𝗨𝗣𝗗𝗔𝗧𝗘𝗗 〕───╮
│
│ 🌸 *@${tag}* is still away~
│
│ 📝 𝗥𝗲𝗮𝘀𝗼𝗻: ${reason}
│ ⏰ 𝗥𝗲𝘀𝗲𝘁: \`\`${formatTime(since)}\`\`
╰━━━━━━━━━━━━━━━━━━━━━━╯`,
        { mentions: [normalizedSender] }
      );
    }

    // Set AFK for the first time
    return reply(
`╭───〔 🌙 𝗔𝗙𝗞 𝗠𝗢𝗗𝗘 〕───╮
│
│ 🌸 *@${tag}* has gone away~
│
│ 📝 𝗥𝗲𝗮𝘀𝗼𝗻: ${reason}
│ 🕐 𝗦𝗶𝗻𝗰𝗲: \`\`${formatTime(since)}\`\`
╰━━━━━━━━━━━━━━━━━━━━━━╯`,
      { mentions: [normalizedSender] }
    );
  },
};
