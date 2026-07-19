import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";

const SETTINGS_FILE = path.resolve("data", "settings.json");
function getSettings() {
  if (!existsSync(SETTINGS_FILE)) return { botMode: "public" };
  try { return JSON.parse(readFileSync(SETTINGS_FILE, "utf8")); } catch { return { botMode: "public" }; }
}
function saveSettings(s) {
  mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
  writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2));
}

export default {
  name: "mode",
  description: "Switch bot between public and private mode",
  category: "owner",
  usage: ".mode <public|private>",
  aliases: ["private", "public", "botmode"],
  isOwner: true,
  async run({ sock, msg, args, cmd }) {
    const jid = msg.key.remoteJid;
    let target = args[0]?.toLowerCase();
    if (cmd === "private") target = "private";
    if (cmd === "public")  target = "public";

    if (!["public", "private"].includes(target)) {
      const current = getSettings().botMode ?? "public";
      return sock.sendMessage(jid, { text: `Current mode: *${current}*\nUsage: .mode public | .mode private` }, { quoted: msg });
    }

    const s = getSettings();
    s.botMode = target;
    saveSettings(s);

    const icon = target === "private" ? "🔒" : "🌐";
    await sock.sendMessage(jid, {
      text: `${icon} Bot switched to *${target}* mode.\n${target === "private" ? "Only owner and staff/mods can use commands." : "Everyone can use commands."}`,
    }, { quoted: msg });
  },
};
