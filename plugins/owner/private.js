import { getBotMode, setBotMode } from "../../lib/pluginManager.mjs";
import { mergeData } from "../../lib/store.mjs";

export default {
  name: "mode",
  description: "Switch bot between public and private mode",
  category: "owner",
  usage: ".mode <public|private>",
  aliases: ["private", "public", "botmode"],
  cooldown: 5,
  isOwner: true,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg, args, cmd }) {
    const jid = msg.key.remoteJid;

    // Allow .private or .public as direct aliases
    let target = args[0]?.toLowerCase();
    if (cmd === "private") target = "private";
    if (cmd === "public")  target = "public";

    if (!["public", "private"].includes(target)) {
      const current = getBotMode();
      return sock.sendMessage(jid, {
        text: `Current mode: *${current}*\nUsage: .mode public | .mode private`,
      }, { quoted: msg });
    }

    setBotMode(target);
    mergeData("settings", { botMode: target });

    const icon = target === "private" ? "🔒" : "🌐";
    await sock.sendMessage(jid, {
      text: `${icon} Bot switched to *${target}* mode.\n${target === "private" ? "Only owner and mods can use commands." : "Everyone can use commands."}`,
    }, { quoted: msg });
  },
};
