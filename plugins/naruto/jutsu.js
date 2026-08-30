import players from "../../lib/player.js";
import jutsuList from "../../lib/jutsu.js";

function findJutsu(input) {
  const value = String(input || "").trim().toLowerCase();
  return jutsuList.find((jutsu) => jutsu.id.toLowerCase() === value)
    || jutsuList[Number.parseInt(value, 10) - 1];
}

export default {
  name: "njutsu",
  aliases: ["ninjutsu", "jutsus"],
  description: "View and learn Naruto jutsu",
  category: "naruto",
  usage: ".njutsu [learn <id>]",

  async run({ sock, msg, text, sender }) {
    const jid = msg.key.remoteJid;
    const player = await players.get(sender);
    if (!player) {
      return sock.sendMessage(jid, { text: "🍃 Use *.nstart* before learning jutsu." }, { quoted: msg });
    }

    const words = String(text || "").trim().split(/\s+/).filter(Boolean);
    if (words[0]?.toLowerCase() === "learn") {
      const jutsu = findJutsu(words.slice(1).join(" "));
      if (!jutsu) {
        return sock.sendMessage(jid, { text: "❌ Jutsu not found. Use *.njutsu* to see the list." }, { quoted: msg });
      }
      if ((player.jutsu || []).includes(jutsu.id)) {
        return sock.sendMessage(jid, { text: `✅ You already know *${jutsu.name}*.` }, { quoted: msg });
      }
      if ((player.level || 1) < (jutsu.level || 1)) {
        return sock.sendMessage(jid, { text: `🔒 *${jutsu.name}* unlocks at level ${jutsu.level}.` }, { quoted: msg });
      }
      if (jutsu.clan && jutsu.clan !== player.clan) {
        return sock.sendMessage(jid, { text: `🔒 *${jutsu.name}* is reserved for the ${jutsu.clan} clan.` }, { quoted: msg });
      }
      await players.learnJutsu(sender, jutsu.id);
      return sock.sendMessage(jid, { text: `✨ Learned *${jutsu.name}*.\nDamage: ${jutsu.damage}  |  Chakra: ${jutsu.chakra}` }, { quoted: msg });
    }

    const known = new Set(player.jutsu || []);
    const lines = jutsuList.slice(0, 24).map((jutsu, index) => {
      const state = known.has(jutsu.id) ? "✅" : ((player.level || 1) >= (jutsu.level || 1) ? "▫️" : "🔒");
      return `${state} *${index + 1}.* ${jutsu.name} — Lv.${jutsu.level} — \`${jutsu.id}\``;
    });
    lines.push("", "Learn one with `.njutsu learn <number or id>`.");
    return sock.sendMessage(jid, { text: `🌀 *JUTSU ARCHIVE*\n\n${lines.join("\n")}` }, { quoted: msg });
  },
};