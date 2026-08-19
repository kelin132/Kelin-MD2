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
  usage: ".fancy <text>[;font number]",
  cooldown: 5,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;
    if (!text?.trim()) {
      return sock.sendMessage(jid, {
        text: "✦ *Fancy Text* ✦\n\nUsage: *.fancy <text>* or *.fancy <text>;font number*\nExample: *.fancy aidoru*\nPick one style: *.fancy aidoru;1*",
      }, { quoted: msg });
    }

    try {
      const input = text.trim();
      const selection = input.match(/^(.*?);(\d+)$/);
      const sourceText = (selection ? selection[1] : input).trim();
      const selectedIndex = selection ? Number(selection[2]) : null;
      if (!sourceText) throw new Error("Enter text before the semicolon");

      const payload = await princeJson(PRINCE_ENDPOINTS.fancy, { text: sourceText });
      const styles = extractStyles(payload);
      if (!styles.length) throw new Error("Prince Tech returned no styled text");
      if (selectedIndex !== null && (!Number.isInteger(selectedIndex) || selectedIndex < 1 || selectedIndex > styles.length)) {
        throw new Error(`Choose a font number from 1 to ${styles.length}`);
      }

      const chosen = selectedIndex === null ? styles : [styles[selectedIndex - 1]];
      const body = chosen.map(({ name, result }, index) => {
        const number = selectedIndex === null ? index + 1 : selectedIndex;
        return `╭─ *${number}. ${name}*\n╰─ ${result}`;
      }).join("\n\n");
      await sock.sendMessage(jid, {
        text: `╭─୨୧「 ✦ 𝐅𝐀𝐍𝐂𝐘 𝐓𝐄𝐗𝐓 」୨୧─╮\n│ ${sourceText}${selectedIndex === null ? "" : ` · Font ${selectedIndex}`}\n╰──────────────────╯\n\n${body}`,
      }, { quoted: msg });
    } catch (error) {
      console.error("[fancy]", error.message);
      await sock.sendMessage(jid, {
        text: `❌ Fancy text failed.\n\n_${error.message}_`,
      }, { quoted: msg });
    }
  },
};
