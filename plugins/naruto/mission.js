import players from "../../lib/player.js";
import missionList from "../../lib/missions.js";

const cooldowns = new Map();
const COOLDOWN = 60 * 1000;

export default {
  name: "nmission",
  aliases: ["nmissions", "shinobimission"],
  description: "Complete Naruto missions for XP and ryo",
  category: "naruto",
  usage: ".nmission [number]",
  cooldown: 3,

  async run({ sock, msg, text, sender }) {
    const jid = msg.key.remoteJid;
    const player = await players.get(sender);
    if (!player) {
      return sock.sendMessage(jid, { text: "🍃 Use *.nstart* before taking missions." }, { quoted: msg });
    }

    const input = String(text || "").trim();
    if (!input) {
      return sock.sendMessage(jid, {
        text: [
          "📜 *AVAILABLE MISSIONS*",
          "",
          ...missionList.map((mission, index) => `${index + 1}. *${mission.name}* [${mission.rank}] — Lv.${mission.minLevel} — ${mission.xp} XP / ${mission.ryo} ryo`),
          "",
          "Start one with `.nmission <number>`.",
        ].join("\n"),
      }, { quoted: msg });
    }

    const last = cooldowns.get(sender) || 0;
    if (Date.now() - last < COOLDOWN) {
      const seconds = Math.ceil((COOLDOWN - (Date.now() - last)) / 1000);
      return sock.sendMessage(jid, { text: `⏳ Your next mission is available in ${seconds}s.` }, { quoted: msg });
    }

    const mission = missionList[Number.parseInt(input, 10) - 1]
      || missionList.find((item) => item.id === input.toLowerCase());
    if (!mission) {
      return sock.sendMessage(jid, { text: "❌ Mission not found. Use *.nmission* to see the list." }, { quoted: msg });
    }
    if ((player.level || 1) < mission.minLevel) {
      return sock.sendMessage(jid, { text: `🔒 You need level ${mission.minLevel} for *${mission.name}*.` }, { quoted: msg });
    }

    const result = await players.addXp(sender, mission.xp);
    await players.addRyo(sender, mission.ryo);
    await players.update(sender, { $inc: { missionsCompleted: 1 }, $set: { updatedAt: Date.now() } });
    cooldowns.set(sender, Date.now());
    const updated = await players.get(sender);

    return sock.sendMessage(jid, {
      text: [
        `✅ *MISSION COMPLETE — ${mission.rank} RANK*`,
        `📜 ${mission.name}`,
        "",
        `⭐ +${mission.xp} XP  |  💰 +${mission.ryo} ryo`,
        result?.levelledUp ? `🎉 Level up! You are now level ${updated.level}.` : "",
        `Current XP: ${updated.xp}/${updated.xpNeeded}`,
      ].filter(Boolean).join("\n"),
    }, { quoted: msg });
  },
};