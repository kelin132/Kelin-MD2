import { princeJson, PRINCE_ENDPOINTS } from "../../lib/princeTech.mjs";

function extractStyles(payload) {
  const styles = payload?.results || payload?.result || payload?.data || payload;
  if (!Array.isArray(styles)) return [];
  return styles.filter((item) => item && typeof item === "object" && item.result)
    .map((item) => ({ name: item.name || "Style", result: item.result }));
}

export default {
  name: "fancy",
  aliases: ["fancytext", "styletext", "stylish"],
  description: "Convert text into decorative Unicode styles",
  category: "utilities",
  usage: ".fancy <text>",
  cooldown: 5,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;
    if (!text?.trim()) {
      return sock.sendMessage(jid, {
        text: "✦ *Fancy Text* ✦\n\nUsage: *.fancy <text>*\nExample: *.fancy Prince Tech*",
      }, { quoted: msg });
    }

    try {
      const payload = await princeJson(PRINCE_ENDPOINTS.fancy, { text: text.trim() });
      const styles = extractStyles(payload);
      if (!styles.length) throw new Error("Prince Tech returned no styled text");
      const body = styles.map(({ name, result }) => `╭─ *${name}*\n╰─ ${result}`).join("\n\n");
      await sock.sendMessage(jid, {
        text: `╭─୨୧「 ✦ 𝐅𝐀𝐍𝐂𝐘 𝐓𝐄𝐗𝐓 」୨୧─╮\n│ ${text.trim()}\n╰──────────────────╯\n\n${body}`,
      }, { quoted: msg });
    } catch (error) {
      console.error("[fancy]", error.message);
      await sock.sendMessage(jid, {
        text: `❌ Fancy text failed.\n\n_${error.message}_`,
      }, { quoted: msg });
    }
  },
};
