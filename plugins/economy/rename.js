import { getUser, saveUser, requireRegistration } from "./database.js";

const RENAME_COOLDOWN = 24 * 60 * 60 * 1000; // 1 day

export default {
  name: "rename",
  aliases: ["setname", "changename"],
  category: "economy",
  description: "Rename your economy account (once per 24 hours)",
  usage: ".rename <new name>",

  async run({ sock, msg, sender, text: rawText }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });
    const name  = rawText.trim();

    if (!name) {
      const user = await getUser(sender);
      return reply(`📛 *Your current name:* ${user.name || "User"}\n\nUse *.rename <new name>* to change it (once/day).`);
    }

    if (name.length < 2 || name.length > 24) return reply("❌ Name must be 2–24 characters.");
    if (/[<>{}[\]\\\/]/.test(name))          return reply("❌ Name contains invalid characters.");

    const user = await getUser(sender);
    const now  = Date.now();

    if (user.lastRename && now - user.lastRename < RENAME_COOLDOWN) {
      const rem  = RENAME_COOLDOWN - (now - user.lastRename);
      const hrs  = Math.floor(rem / 3_600_000);
      const mins = Math.floor((rem % 3_600_000) / 60_000);
      return reply(`⏰ *Cooldown!*\n\nYou can rename again in *${hrs}h ${mins}m*.`);
    }

    const oldName    = user.name || "User";
    user.name        = name;
    user.lastRename  = now;
    await saveUser(sender, user);

    return reply(`✅ *Name changed!*\n\n📛 ${oldName} → *${name}*`);
  },
};
