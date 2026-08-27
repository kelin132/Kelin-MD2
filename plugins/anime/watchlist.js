import fs from "fs";
import path from "path";
import { normalizeJid } from "../../lib/identity.mjs";

const FILE = path.resolve("./database/watchlist.json");

function load() {
  if (!fs.existsSync(FILE)) return {};
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { return {}; }
}
function save(data) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

export default {
  name: "watchlist",
  aliases: ["animewatch", "wl"],
  description: "Track anime you are watching. Use: add <name> | <ep>, remove <name>, clear, or view",
  category: "anime",
  usage: ".watchlist [add <name>|<ep> / remove <name> / clear]",
  cooldown: 3,

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;
    const normalizedSender = normalizeJid(sender);
    const data = load();
    if (!data[normalizedSender]) data[normalizedSender] = [];

    const sub = args[0]?.toLowerCase();

    if (!sub || sub === "view" || sub === "list") {
      if (!data[normalizedSender].length) return sock.sendMessage(jid, { text: "📺 Your watchlist is empty!\n\nAdd with: .watchlist add <anime name> | <episode>" }, { quoted: msg });
      let txt = "📺 *YOUR ANIME WATCHLIST* 📺\n\n";
      data[normalizedSender].forEach((a, i) => { txt += `${i + 1}. *${a.title}*  —  Ep ${a.episode}\n`; });
      return sock.sendMessage(jid, { text: txt.trim() }, { quoted: msg });
    }

    if (sub === "clear") {
      data[normalizedSender] = [];
      save(data);
      return sock.sendMessage(jid, { text: "✅ Watchlist cleared!" }, { quoted: msg });
    }

    if (sub === "remove" || sub === "rm") {
      const name = args.slice(1).join(" ");
      const idx  = data[normalizedSender].findIndex(a => a.title.toLowerCase() === name.toLowerCase());
      if (idx === -1) return sock.sendMessage(jid, { text: `❌ *${name}* not found in your watchlist.` }, { quoted: msg });
      data[normalizedSender].splice(idx, 1);
      save(data);
      return sock.sendMessage(jid, { text: `✅ Removed *${name}* from your watchlist.` }, { quoted: msg });
    }

    if (sub === "add") {
      const rest  = args.slice(1).join(" ");
      const parts = rest.split("|").map(p => p.trim());
      if (parts.length < 2) return sock.sendMessage(jid, { text: "❌ Format: .watchlist add <anime name> | <episode>" }, { quoted: msg });
      const [title, episode] = parts;
      const existing = data[normalizedSender].findIndex(a => a.title.toLowerCase() === title.toLowerCase());
      if (existing !== -1) { data[normalizedSender][existing].episode = episode; }
      else { data[normalizedSender].push({ title, episode }); }
      save(data);
      return sock.sendMessage(jid, { text: `✅ *${title}* — Episode ${episode} saved to your watchlist!` }, { quoted: msg });
    }

    await sock.sendMessage(jid, { text: "❌ Unknown subcommand.\n\nUsage:\n.watchlist — view list\n.watchlist add <name> | <ep>\n.watchlist remove <name>\n.watchlist clear" }, { quoted: msg });
  },
};
